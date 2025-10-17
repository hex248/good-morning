package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"good_morning_backend/internal/database"
	"good_morning_backend/internal/models"
	"good_morning_backend/internal/spotify"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
)

const (
	GoogleAuthURL     = "https://accounts.google.com/o/oauth2/auth"
	GoogleTokenURL    = "https://oauth2.googleapis.com/token"
	GoogleUserInfoURL = "https://www.googleapis.com/oauth2/v2/userinfo"
	MaxFileSize       = 5 * 1024 * 1024 // 5mb
	AllowedTypes      = "image/jpeg,image/png,image/webp"
)

type GoogleUser struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
	Locale        string `json:"locale"`
}

func redirectToFrontend(c *gin.Context, path string) {
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}
	c.Redirect(http.StatusTemporaryRedirect, frontendURL+path)
}

func initR2Client() (*s3.Client, error) {
	accessKey := os.Getenv("R2_ACCESS_KEY_ID")
	secretKey := os.Getenv("R2_SECRET_ACCESS_KEY")
	endpoint := os.Getenv("R2_ENDPOINT")
	region := os.Getenv("R2_REGION")

	if accessKey == "" || secretKey == "" || endpoint == "" || region == "" {
		return nil, fmt.Errorf("R2 credentials not set")
	}

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
		config.WithRegion(region),
		config.WithEndpointResolver(aws.EndpointResolverFunc(func(service, region string) (aws.Endpoint, error) {
			return aws.Endpoint{URL: endpoint}, nil
		})),
	)
	if err != nil {
		return nil, err
	}

	return s3.NewFromConfig(cfg), nil
}

func validateFile(file *multipart.FileHeader) error {
	if file.Size > MaxFileSize {
		return fmt.Errorf("file size exceeds 5mb limit")
	}

	contentType := file.Header.Get("Content-Type")
	if !strings.Contains(AllowedTypes, contentType) {
		return fmt.Errorf("invalid file type: %s", contentType)
	}

	ext := filepath.Ext(file.Filename)
	if !strings.Contains(".jpg.jpeg.png.webp", strings.ToLower(ext)) {
		return fmt.Errorf("invalid file extension: %s", ext)
	}

	return nil
}

func generateFileName(originalName string) string {
	ext := filepath.Ext(originalName)
	timestamp := time.Now().UnixNano()
	randomBytes := make([]byte, 8)
	rand.Read(randomBytes)
	return fmt.Sprintf("%d_%x%s", timestamp, randomBytes, ext)
}

func generateState() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

func handleGoogleLogin(c *gin.Context) {
	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	redirectURL := os.Getenv("GOOGLE_REDIRECT_URL")
	state := generateState()

	params := url.Values{}
	params.Add("client_id", clientID)
	params.Add("redirect_uri", redirectURL)
	params.Add("scope", "openid email profile")
	params.Add("response_type", "code")
	params.Add("state", state)
	params.Add("access_type", "offline")

	authURL := GoogleAuthURL + "?" + params.Encode()
	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

func handleGoogleCallback(c *gin.Context) {
	code := c.Query("code")

	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no authorization code"})
		return
	}

	token, err := exchangeCodeForToken(code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to exchange token"})
		return
	}

	googleUser, err := getGoogleUserInfo(token.AccessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user info"})
		return
	}

	// check if user exists or create new
	var user models.User
	result := database.DB.Where("google_id = ?", googleUser.ID).First(&user)
	if result.Error != nil {
		if result.Error.Error() == "record not found" {
			user = models.User{
				ID:                   generateUserID(),
				GoogleID:             googleUser.ID,
				Email:                googleUser.Email,
				Username:             googleUser.Name,
				Timezone:             "UTC",
				UniqueCode:           generateUniqueCode(),
				NotificationsEnabled: false,
				Picture:              &googleUser.Picture,
			}
			if err := database.DB.Create(&user).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
			return
		}
	}

	// generate JWT and set in cookie
	jwtToken, err := generateJWT(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}
	c.SetCookie("jwt", jwtToken, 86400, "/", "", false, true) // 24 hours, HTTP-only, secure if HTTPS

	// redirect to frontend
	redirectToFrontend(c, "/")
}

type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

func exchangeCodeForToken(code string) (*TokenResponse, error) {
	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	clientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	redirectURL := os.Getenv("GOOGLE_REDIRECT_URL")

	data := url.Values{}
	data.Set("code", code)
	data.Set("client_id", clientID)
	data.Set("client_secret", clientSecret)
	data.Set("redirect_uri", redirectURL)
	data.Set("grant_type", "authorization_code")

	resp, err := http.PostForm(GoogleTokenURL, data)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var token TokenResponse
	if err := json.Unmarshal(body, &token); err != nil {
		return nil, err
	}

	return &token, nil
}

func getGoogleUserInfo(accessToken string) (*GoogleUser, error) {
	req, err := http.NewRequest("GET", GoogleUserInfoURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var googleUser GoogleUser
	if err := json.Unmarshal(body, &googleUser); err != nil {
		return nil, err
	}

	return &googleUser, nil
}

func generateUserID() string {
	return fmt.Sprintf("user_%d", time.Now().UnixNano())
}

func generateUniqueCode() string {
	adjectives := []string{"brave", "clever", "swift", "mighty", "gentle", "wild", "fierce", "loyal", "playful", "wise", "mysterious", "ancient", "radiant", "shadowy", "vibrant", "ethereal", "noble", "savage", "serene", "thunderous"}
	colors := []string{"red", "blue", "green", "yellow", "purple", "orange", "pink", "brown", "black", "white", "grey", "cyan", "magenta", "lime", "teal", "indigo", "violet", "gold", "silver", "bronze"}
	animals := []string{"dog", "cat", "bird", "fish", "rabbit", "lion", "tiger", "elephant", "giraffe", "zebra", "monkey", "bear", "wolf", "fox", "deer", "horse", "cow", "pig", "sheep", "goat", "chicken", "duck", "goose", "turkey", "eagle", "hawk", "owl", "parrot", "penguin", "dolphin", "shark", "whale", "octopus", "spider", "bee", "butterfly", "ant", "fly", "snake", "lizard", "frog", "turtle", "crocodile", "dinosaur", "dragon", "unicorn", "phoenix"}

	adjective := adjectives[time.Now().UnixNano()%int64(len(adjectives))]
	color := colors[time.Now().UnixNano()%int64(len(colors))]
	animal := animals[time.Now().UnixNano()%int64(len(animals))]

	return adjective + "_" + color + "_" + animal
}

func generateJWT(userID string) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "", fmt.Errorf("JWT_SECRET not set")
	}
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString, err := c.Cookie("jwt")
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}

		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "server error"})
			c.Abort()
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			userID := claims["user_id"].(string)
			c.Set("user_id", userID)
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}

		c.Next()
	}
}

func handleGetMe(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var user models.User
	if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var partner *models.User
	if user.PairedUserID != nil {
		partner = &models.User{}
		if err := database.DB.Where("id = ?", *user.PairedUserID).First(partner).Error; err != nil {
			partner = nil
		}
	}

	c.JSON(http.StatusOK, gin.H{"user": user, "partner": partner})
}

func handleUserPair(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var requestBody struct {
		PairCode string `json:"pairCode" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	// find partner with the unique code
	var partner models.User
	if err := database.DB.Where("unique_code = ?", requestBody.PairCode).First(&partner).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "partner not found"})
		return
	}

	if partner.ID == userID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot pair with yourself"})
		return
	}

	var currentUser models.User
	if err := database.DB.Where("id = ?", userID).First(&currentUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	// if already paired
	if currentUser.PairedUserID != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "already paired"})
		return
	}

	if partner.PairedUserID != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "partner already paired with someone else"}) // ouch :(
		return
	}

	// pair users and save
	currentUser.PairedUserID = &partner.ID
	partner.PairedUserID = &currentUser.ID

	if err := database.DB.Save(&currentUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to pair users"})
		return
	}

	if err := database.DB.Save(&partner).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to pair users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "users paired successfully"})
}

func handleUserGet(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var user models.User
	if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	var partner *models.User
	if user.PairedUserID != nil {
		partner = &models.User{}
		if err := database.DB.Where("id = ?", *user.PairedUserID).First(partner).Error; err != nil {
			partner = nil
		}
	}

	c.JSON(http.StatusOK, gin.H{"user": user, "partner": partner})
}

func handleUserEdit(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var requestBody struct {
		Username string `json:"username" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	var user models.User
	if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user.Username = requestBody.Username
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "username updated successfully"})
}

func handleCreateNotice(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var user models.User
	if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	if user.PairedUserID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no paired user"})
		return
	}

	var requestBody struct {
		Message         *string `json:"message"`
		PhotoURL        *string `json:"photoUrl"`
		SongURL         *string `json:"songUrl"`
		SongExplanation *string `json:"songExplanation"`
		ForegroundColor string  `json:"foregroundColor" binding:"required"`
		BackgroundColor string  `json:"backgroundColor" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	var songTitle, songArtist, songAlbumCover *string
	if requestBody.SongURL != nil && *requestBody.SongURL != "" {
		trackID, err := spotify.ParseTrackID(*requestBody.SongURL)
		if err == nil {
			trackDetails, err := spotify.FetchTrackDetails(trackID)
			if err == nil {
				songTitle = &trackDetails.Title
				songArtist = &trackDetails.Artist
				songAlbumCover = &trackDetails.AlbumCover
			} else {
				log.Printf("failed to fetch Spotify track details: %v", err)
			}
		} else {
			log.Printf("failed to parse Spotify URL: %v", err)
		}
	}

	var partner models.User
	if err := database.DB.Where("id = ?", *user.PairedUserID).First(&partner).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get partner"})
		return
	}

	// resetAt is midnight in partner's timezone
	now := time.Now()
	location, err := time.LoadLocation(partner.Timezone)
	if err != nil {
		location = time.UTC // fallback to UTC if invalid timezone
	}
	partnerTime := now.In(location)
	midnight := time.Date(partnerTime.Year(), partnerTime.Month(), partnerTime.Day()+1, 0, 0, 0, 0, location)
	resetAt := midnight

	notice := models.Notice{
		ID:              fmt.Sprintf("notice_%d", time.Now().UnixNano()),
		SenderID:        user.ID,
		RecipientID:     partner.ID,
		Message:         requestBody.Message,
		PhotoURL:        requestBody.PhotoURL,
		SongURL:         requestBody.SongURL,
		SongTitle:       songTitle,
		SongArtist:      songArtist,
		SongAlbumCover:  songAlbumCover,
		SongExplanation: requestBody.SongExplanation,
		ForegroundColor: requestBody.ForegroundColor,
		BackgroundColor: requestBody.BackgroundColor,
		Reactions:       []string{},
		SentAt:          time.Now(),
		ResetAt:         resetAt,
	}

	if err := database.DB.Create(&notice).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create notice"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "notice created successfully"})
}

func handleGetNotice(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var user models.User
	if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// find today's notice for the user
	var notice models.Notice
	if err := database.DB.Where("recipient_id = ? AND reset_at > ?", user.ID, time.Now()).Last(&notice).Error; err != nil {
		if err.Error() == "record not found" {
			c.JSON(http.StatusOK, gin.H{"notice": nil})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get notice"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"notice": notice})
}

func handleUpload(c *gin.Context) {
	r2Client, err := initR2Client()
	if err != nil {
		log.Fatalf("failed to initialize R2 client: %v", err)
	}

	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no image file provided"})
		return
	}

	if err := validateFile(file); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// open file
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open file"})
		return
	}
	defer src.Close()

	// read file content
	buf := make([]byte, file.Size)
	if _, err := io.ReadFull(src, buf); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file"})
		return
	}

	fileName := generateFileName(file.Filename)
	bucketName := os.Getenv("R2_BUCKET_NAME")

	// upload
	_, err = r2Client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:      aws.String(bucketName),
		Key:         aws.String(fileName),
		Body:        bytes.NewReader(buf),
		ContentType: aws.String(file.Header.Get("Content-Type")),
		ACL:         "public-read",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upload file"})
		return
	}

	publicURL := os.Getenv("R2_PUBLIC_URL")
	if publicURL == "" {
		publicURL = os.Getenv("R2_ENDPOINT")
	}
	imageURL := fmt.Sprintf("%s/%s", publicURL, fileName)

	c.JSON(http.StatusOK, gin.H{"url": imageURL})
}

func handlePushSubscribe(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var requestBody struct {
		Endpoint string `json:"endpoint" binding:"required"`
		P256dh   string `json:"p256dh" binding:"required"`
		Auth     string `json:"auth" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	database.DB.Where("user_id = ?", userID).Delete(&models.PushSubscription{})

	subscription := models.PushSubscription{
		ID:       fmt.Sprintf("sub_%d", time.Now().UnixNano()),
		UserID:   userID.(string),
		Endpoint: requestBody.Endpoint,
		P256dh:   requestBody.P256dh,
		Auth:     requestBody.Auth,
	}

	if err := database.DB.Create(&subscription).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save subscription"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "subscription saved successfully"})
}

func handlePushUnsubscribe(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	result := database.DB.Where("user_id = ?", userID).Delete(&models.PushSubscription{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to unsubscribe"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "unsubscribed successfully"})
}

func main() {
	database.InitDB()
	database.DB.AutoMigrate(&models.User{}, &models.Notice{}, &models.PushSubscription{})

	r := gin.Default()

	// CORS middleware
	config := cors.DefaultConfig()
	frontendURL := os.Getenv("FRONTEND_URL")
	config.AllowOrigins = []string{frontendURL}
	config.AllowCredentials = true
	r.Use(cors.New(config))

	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "good morning! backend",
		})
	})

	// oauth routes
	r.GET("/auth/google", handleGoogleLogin)
	r.GET("/auth/google/callback", handleGoogleCallback)
	r.GET("/logout", func(c *gin.Context) {
		// clear JWT cookie
		c.SetCookie("jwt", "", -1, "/", "", false, true)
		redirectToFrontend(c, "/")
	})

	// protected routes
	protected := r.Group("/")
	protected.Use(authMiddleware())
	{
		protected.GET("/me", handleGetMe)
		protected.POST("/user/pair", handleUserPair)
		protected.GET("/user/get", handleUserGet)
		protected.PUT("/user/edit", handleUserEdit)
		protected.POST("/notices/create", handleCreateNotice)
		protected.GET("/notices/get", handleGetNotice)
		protected.POST("/upload", handleUpload)
		protected.POST("/push/subscribe", handlePushSubscribe)
		protected.DELETE("/push/unsubscribe", handlePushUnsubscribe)
	}

	log.Fatal(r.Run(":24804"))
}
