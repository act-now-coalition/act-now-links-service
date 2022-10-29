#!/bin/bash
# Script to fetch a Firebase ID token for an authenticated user.

email="$1";
password="$2";

if [ -z "$email" ] || [ -z "$password" ]; then
    echo "Usage: $0 <email> <password>";
    exit 1;
fi

# Make curl request to get a Firebase ID token.
req=$(curl -s -X POST \
--url 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDRW6y_kxN51ZUNJr43y2Mgd6v8BLu-ih4' \
--header 'Content-Type: application/json' \
--data "{
  'email': '$email',
  'password': '$password',
  'returnSecureToken': true
  }")

# Use Node.js to parse the JSON response and extract the ID token / expiration.
# TODO: add error handling. If no ID token is printed, assume an error occurred for now.
ts-node -e 'console.log("ID TOKEN: ", JSON.parse(process.argv[1]).idToken)' "$req"
ts-node -e 'console.log("EXPIRES IN: ", JSON.parse(process.argv[1]).expiresIn / 3600, "hour(s)")' "$req"