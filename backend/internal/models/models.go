package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID                   string    `gorm:"primaryKey" json:"id"`
	Timezone             string    `json:"timezone"`
	Username             string    `json:"username"`
	Email                string    `json:"email"`
	GoogleID             string    `json:"googleId"`
	UniqueCode           string    `json:"uniqueCode"`
	NotificationsEnabled bool      `json:"notificationsEnabled"`
	PairedUserID         *string   `json:"pairedUserId"`
	Picture              *string   `json:"picture"`
	CreatedAt            time.Time `json:"createdAt"`
	UpdatedAt            time.Time `json:"updatedAt"`
}

type Notice struct {
	ID              string     `gorm:"primaryKey" json:"id"`
	SenderID        string     `json:"senderId"`
	RecipientID     string     `json:"recipientId"`
	Message         *string    `json:"message"`
	PhotoURL        *string    `json:"photoUrl"`
	SongURL         *string    `json:"songUrl"`
	SongTitle       *string    `json:"songTitle"`
	SongArtist      *string    `json:"songArtist"`
	SongAlbumCover  *string    `json:"songAlbumCover"`
	SongExplanation *string    `json:"songExplanation"`
	ForegroundColor string     `json:"foregroundColor"`
	BackgroundColor string     `json:"backgroundColor"`
	Reactions       []string   `gorm:"type:text[]" json:"reactions"`
	SentAt          time.Time  `json:"sentAt"`
	EditedAt        *time.Time `json:"editedAt"`
	ResetAt         time.Time  `json:"resetAt"`
}

func (Notice) TableName() string {
	return "Notice"
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	u.CreatedAt = time.Now()
	u.UpdatedAt = time.Now()
	return nil
}

func (u *User) BeforeUpdate(tx *gorm.DB) error {
	u.UpdatedAt = time.Now()
	return nil
}

func (User) TableName() string {
	return "User"
}
