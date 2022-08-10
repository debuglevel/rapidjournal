# RapidJournal
RapidJournal is a very simple App to take notes.

It is intended as a work journal to quickly take notes on the fly which you don't even actually need and therefore  forget immidiately - e.g. to remember what you've worked on/with the last couple of years. But it can probably also be used as various other types of journals (although I highly recommend to use pen and paper for personal journaling).

## Architecture
Just shove some JSON into CouchDB. That's it.

The application (e.g. the WebUI) builds a JSON and `PUT`s it into a local PouchDB. PouchDB is a JavaScript CouchDB clone thingy, which seamlessly syncs with a real CouchDB (protected with the CouchDB internal authorization) once there is connectivity. Afterwards, get all JSON objects from PouchDB/CouchDB and display them.

## Database structure
As it uses NoSQL, the database structure is just "meh, whatever". But to circumvent complete chaos, we still have to define something:
* `_id` should be a ISO-8601 timestamp. Or at least something which makes sense to sort alphanumerically. The `all_docs` operation relies on this - otherwise (e.g. UUID) it is just some random order.
* `datetime` is the actual field which really should use ISO-8601 as the timestamp.
* `content` contains the main text.
