package spotify

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
)

type SpotifyTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

type SpotifyTrackResponse struct {
	Name    string `json:"name"`
	Artists []struct {
		Name string `json:"name"`
	} `json:"artists"`
	Album struct {
		Images []struct {
			URL string `json:"url"`
		} `json:"images"`
	} `json:"album"`
}

type TrackDetails struct {
	Title      string
	Artist     string
	AlbumCover string
}

func GetAccessToken() (string, error) {
	clientID := os.Getenv("SPOTIFY_CLIENT_ID")
	clientSecret := os.Getenv("SPOTIFY_CLIENT_SECRET")
	if clientID == "" || clientSecret == "" {
		return "", fmt.Errorf("SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET not set")
	}

	auth := base64.StdEncoding.EncodeToString([]byte(clientID + ":" + clientSecret))

	data := url.Values{}
	data.Set("grant_type", "client_credentials")

	req, err := http.NewRequest("POST", "https://accounts.spotify.com/api/token", strings.NewReader(data.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Basic "+auth)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var tokenResp SpotifyTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", err
	}

	return tokenResp.AccessToken, nil
}

func FetchTrackDetails(trackID string) (*TrackDetails, error) {
	token, err := GetAccessToken()
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("GET", fmt.Sprintf("https://api.spotify.com/v1/tracks/%s", trackID), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("Spotify API error: %s", resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var trackResp SpotifyTrackResponse
	if err := json.Unmarshal(body, &trackResp); err != nil {
		return nil, err
	}

	details := &TrackDetails{
		Title:  trackResp.Name,
		Artist: trackResp.Artists[0].Name,
	}
	if len(trackResp.Album.Images) > 0 {
		details.AlbumCover = trackResp.Album.Images[0].URL
	}

	return details, nil
}

func ParseTrackID(songURL string) (string, error) {
	if !strings.Contains(songURL, "spotify.com/track/") {
		return "", fmt.Errorf("invalid Spotify URL")
	}

	parts := strings.Split(songURL, "/track/")
	if len(parts) < 2 {
		return "", fmt.Errorf("invalid Spotify URL")
	}

	trackID := strings.Split(parts[1], "?")[0]
	return trackID, nil
}
