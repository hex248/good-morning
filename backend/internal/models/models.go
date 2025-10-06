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

func (u *User) BeforeCreate(tx *gorm.DB) error {
	u.CreatedAt = time.Now()
	u.UpdatedAt = time.Now()
	return nil
}

func (u *User) BeforeUpdate(tx *gorm.DB) error {
	u.UpdatedAt = time.Now()
	return nil
}
