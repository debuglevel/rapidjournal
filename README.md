# rapidjournal

## Database structure
As it uses NoSQL, the database structure is "oh very flexible". But to circumvent complete chaos:
* `_id` should be a ISO-8601-ish timestamp (i.e. it makes sense to sort it alphanumerically). The `datetime` field also saves the timestamp, but `_id` is used as sorting key on the `allDocs` operation.
* `content` contains the main text.
