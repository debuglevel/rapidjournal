(function () {
  'use strict';

  var ENTER_KEY = 13;
  var newEntryDom = document.getElementById('new-entry');
  var syncDom = document.getElementById('sync-wrapper');

  // Use local database to write in offline mode and sync afterwards.
  var db = new PouchDB('rapidjournal');

  let password = prompt("Please enter your password");
  // Remote database to replicate/sync to when online.
  let remoteCouch;
  if (password == null || password == "") {
    remoteCouch = undefined;
  } else {
    remoteCouch = 'https://marc:'+password+'@debuglevel.de/couchdb/rapidjournal';
  }

  // Subscribe to database changes
  db.changes({
    since: 'now',
    live: true
  }).on('change', showEntrys);

  /**
   * Adds an entry to the local database.
   * @param {String} text Text of the entry
   */
  function addEntry(text) {
    var entry = {
      _id: new Date().toISOString(),
      datetime: new Date().toISOString(),
      content: text,
    };

    db.put(entry, function callback(err, result) {
      if (!err) {
        console.log('Posting entry successful.');
      }else{
        console.error('Posting entry failed.');
        console.error(err);
      }
    });
  }

  /**
   * Reads all entries from the local database and renders them.
   */
  function showEntrys() {
    db.allDocs({ include_docs: true, descending: true }, function (err, result) {
      renderEntrys(result.rows);
    });
  }

  /**
   * Removes an entry from the local database.
   * @param {*} entry The entry object to remove (probably only needs an object with _id set).
   */
  function deleteButtonPressed(entry) {
    db.remove(entry);
  }

  // The input box when editing a entry has blurred, we should save
  // the new title or delete the entry if the title is empty
  function entryBlurred(entry, event) {
    var trimmedText = event.target.value.trim();
    if (!trimmedText) {
      db.remove(entry);
    } else {
      entry.content = trimmedText;
      db.put(entry);
    }
  }

  /**
   * Initialize synchronization with the remote CouchDB.
   */
  function initializeSynchronization() {
    syncDom.setAttribute('data-sync-state', 'syncing');

    var opts = { live: true };
    db.replicate.to(remoteCouch, opts, syncError);
    db.replicate.from(remoteCouch, opts, syncError);
  }

  /**
   * Show sync error on UI.
   */
  function syncError() {
    syncDom.setAttribute('data-sync-state', 'error');
  }

  /**
   * Display input box to edit an entry.
   * @param {*} entry 
   */
  function entryDoubleClicked(entry) {
    var div = document.getElementById('li_' + entry._id);
    var inputEditEntry = document.getElementById('input_' + entry._id);
    div.className = 'editing';
    inputEditEntry.focus();
  }

  // If they press enter while editing an entry, blur it to trigger save
  // TODO: Seems like a hack.
  function entryKeyPressed(entry, event) {
    if (event.keyCode === ENTER_KEY) {
      var inputEditEntry = document.getElementById('input_' + entry._id);
      inputEditEntry.blur();
    }
  }

  /**
   * Builds an HTML list item (<li>) containing the entry.
   * @param {*} entry 
   * @returns HTML list item
   */
  function createEntryListItem(entry) {
    var datelabel = document.createElement('label');
    datelabel.className = 'datetime';
    datelabel.appendChild(document.createTextNode(entry.datetime));

    var label = document.createElement('label');
    label.appendChild(document.createTextNode(entry.content));
    label.addEventListener('dblclick', entryDoubleClicked.bind(this, entry));

    var deleteLink = document.createElement('button');
    deleteLink.className = 'delete';
    deleteLink.addEventListener('click', deleteButtonPressed.bind(this, entry));

    var divDisplay = document.createElement('div');
    divDisplay.className = 'view';
    divDisplay.appendChild(datelabel);
    divDisplay.appendChild(label);
    divDisplay.appendChild(deleteLink);

    var inputEditEntry = document.createElement('input');
    inputEditEntry.id = 'input_' + entry._id;
    inputEditEntry.className = 'edit';
    inputEditEntry.value = entry.content;
    inputEditEntry.addEventListener('keypress', entryKeyPressed.bind(this, entry));
    inputEditEntry.addEventListener('blur', entryBlurred.bind(this, entry));

    var li = document.createElement('li');
    li.id = 'li_' + entry._id;
    li.appendChild(divDisplay);
    li.appendChild(inputEditEntry);

    return li;
  }

  /**
   * Renders all entries into the list.
   * @param {*} entrys 
   */
  function renderEntrys(entrys) {
    var ul = document.getElementById('entry-list');

    ul.innerHTML = '';

    entrys.forEach(function (entry) {
      ul.appendChild(createEntryListItem(entry.doc));
    });
  }

  function newEntryKeyPressHandler(event) {
    if (event.keyCode === ENTER_KEY) {
      addEntry(newEntryDom.value);
      newEntryDom.value = '';
    }
  }

  /**
   * Adds event listeners to the new-entry input box.
   */
  function addEventListeners() {
    newEntryDom.addEventListener('keypress', newEntryKeyPressHandler, false);
  }

  addEventListeners();
  showEntrys();

  if (remoteCouch) {
    initializeSynchronization();
  }
})();
