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

  function addEntry(text) {
    var entry = {
      _id: new Date().toISOString(),
      datetime: new Date().toISOString(),
      content: text,
    };
    db.put(entry, function callback(err, result) {
      if (!err) {
        console.log('Successfully posted a entry!');
      }
    });
  }

  // Show the current list of entrys by reading them from the database
  function showEntrys() {
    db.allDocs({ include_docs: true, descending: true }, function (err, doc) {
      redrawEntrysUI(doc.rows);
    });
  }

  // function checkboxChanged(entry, event) {
  //   entry.completed = event.target.checked;
  //   db.put(entry);
  // }

  // User pressed the delete button for a entry, delete it
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

  // Initialize a sync with the remote server
  function sync() {
    syncDom.setAttribute('data-sync-state', 'syncing');
    var opts = { live: true };
    db.replicate.to(remoteCouch, opts, syncError);
    db.replicate.from(remoteCouch, opts, syncError);
  }

  // There was some form or error syncing
  function syncError() {
    syncDom.setAttribute('data-sync-state', 'error');
  }

  // User has double clicked a entry, display an input so they can edit the title
  function entryDblClicked(entry) {
    var div = document.getElementById('li_' + entry._id);
    var inputEditEntry = document.getElementById('input_' + entry._id);
    div.className = 'editing';
    inputEditEntry.focus();
  }

  // If they press enter while editing an entry, blur it to trigger save
  // (or delete)
  function entryKeyPressed(entry, event) {
    if (event.keyCode === ENTER_KEY) {
      var inputEditEntry = document.getElementById('input_' + entry._id);
      inputEditEntry.blur();
    }
  }

  // Given an object representing a entry, this will create a list item
  // to display it.
  function createEntryListItem(entry) {
    // var checkbox = document.createElement('input');
    // checkbox.className = 'toggle';
    // checkbox.type = 'checkbox';
    // checkbox.addEventListener('change', checkboxChanged.bind(this, entry));

    var label = document.createElement('label');
    label.appendChild(document.createTextNode(entry.content));
    label.addEventListener('dblclick', entryDblClicked.bind(this, entry));

    var deleteLink = document.createElement('button');
    deleteLink.className = 'destroy';
    deleteLink.addEventListener('click', deleteButtonPressed.bind(this, entry));

    var divDisplay = document.createElement('div');
    divDisplay.className = 'view';
    //divDisplay.appendChild(checkbox);
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

    // if (entry.completed) {
    //   li.className += 'complete';
    //   checkbox.checked = true;
    // }

    return li;
  }

  function redrawEntrysUI(entrys) {
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

  function addEventListeners() {
    newEntryDom.addEventListener('keypress', newEntryKeyPressHandler, false);
  }

  addEventListeners();
  showEntrys();

  if (remoteCouch) {
    sync();
  }

})();
