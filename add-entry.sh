source configuration.sh

read -s -p "Password: " PASSWORD
echo
read -p "Content: " CONTENT

DATETIME=$(date --iso-8601=seconds)
ID=$(uuidgen)

JSON_STRING=$( jq -n \
                  --arg content "$CONTENT" \
                  --arg datetime "$DATETIME" \
                  '{datetime: $datetime, content: $content}' )

#echo $CONTENT
#echo $USERNAME
#echo $URL
#echo $JSON_STRING

curl -X PUT $URL/$ID -u $USERNAME:$PASSWORD -d "$JSON_STRING"