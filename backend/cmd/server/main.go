package main

import (
	"github.com/gin-gonic/gin"
	"good_morning_backend/internal/database"
	"good_morning_backend/internal/models"
	"log"
)

func main() {
	database.InitDB()
	database.DB.AutoMigrate(&models.User{}, &models.Notice{})
	r := gin.Default()
	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "good morning! backend",
		})
	})
	log.Fatal(r.Run(":24804"))
}
