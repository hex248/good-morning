package models

import (
    "gorm.io/gorm"
    "time"
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
    SongExplanation *string    `json:"songExplanation"`
    Color           string     `json:"color"`
    Reactions       []string   `gorm:"type:text[]" json:"reactions"`
    SentAt          time.Time  `json:"sentAt"`
    EditedAt        *time.Time `json:"editedAt"`
    ResetAt         time.Time  `json:"resetAt"`
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
