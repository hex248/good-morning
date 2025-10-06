#!/bin/bash

cd backend
go mod tidy
go build -o server cmd/server/main.go
cd ..