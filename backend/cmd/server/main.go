package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"good_morning_backend/internal/database"
	"good_morning_backend/internal/models"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"
)

const (
	GoogleAuthURL     = "https://accounts.google.com/o/oauth2/auth"
	GoogleTokenURL    = "https://oauth2.googleapis.com/token"
	GoogleUserInfoURL = "https://www.googleapis.com/oauth2/v2/userinfo"
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

	c.JSON(http.StatusOK, gin.H{"message": "Authentication successful"})
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
	colors := []string{"red", "blue", "green", "yellow", "purple", "orange", "pink", "brown", "black", "white", "gray", "cyan", "magenta", "lime", "teal", "indigo", "violet", "gold", "silver", "bronze"}
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

func main() {
	database.InitDB()
	database.DB.AutoMigrate(&models.User{}, &models.Notice{})
	r := gin.Default()

	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "good morning! backend",
		})
	})

	// oauth routes
	r.GET("/auth/google", handleGoogleLogin)
	r.GET("/auth/google/callback", handleGoogleCallback)

	log.Fatal(r.Run(":24804"))
}
