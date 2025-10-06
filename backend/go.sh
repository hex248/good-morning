#!/bin/bash

go mod tidy
go build -o server cmd/server/main.go

./server
