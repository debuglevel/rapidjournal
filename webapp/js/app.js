(function () {
  'use strict';

  function getRemoteCouchDbUrl(password) {
    let username = 'marc';
    let host = 'debuglevel.de';
    let path = 'couchdb/rapidjournal';
    return 'https://' + username + ':' + password + '@' + host + '/' + path;
  }

  function promptPassword() {
    let password = prompt("Please enter your password");
    if (password == null || password == "") {
      return undefined;
    } else {
      return password;
    }
  }

  var ENTER_KEY = 13;
  var newEntryDom = document.getElementById('new-entry');
  var syncDom = document.getElementById('sync-wrapper');

  // Use local database to write in offline mode and sync afterwards.
  var db = new PouchDB('rapidjournal');

  let password = promptPassword();

  // Remote database to replicate/sync to when online.
  let remoteCouch;
  if (password == null || password == "") {
    remoteCouch = undefined;
  } else {
    remoteCouch = getRemoteCouchDbUrl(password);
  }

  // Subscribe to database changes
  db.changes({
    since: 'now',
    live: true
  }).on('change', showAllEntries);

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
      } else {
        console.error('Posting entry failed.');
        console.error(err);
      }
    });
  }

  /**
   * Reads all entries from the local database and renders them.
   */
  function showAllEntries(searchString) {
    if (searchString === undefined || searchString === null || searchString === '') {
      // Just query everything (more efficient than a query).
      db.allDocs(
        {
          include_docs: true,
          descending: true,
        },
        function (err, result) {
          renderAllEntries(result.rows); // Each element contains a doc property which contains the actual document.
        }
      );
    } else {
      console.log(db);
      // Query for entries containing the search string in their content attribute.
      db.find({
        selector: { content: { $regex: new RegExp(searchString, 'i') } },
        //sort: [{ datetime: 'desc' }]
      }).then(function (result) {
        renderAllEntries(result.docs); // Each element is the actual document.
      }).catch(function (err) {
        console.error(err);
      });
    }
  }

  /**
   * Removes an entry from the local database.
   * @param {*} entry The entry object to remove (probably only needs an object with _id set).
   */
  function onDeleteButtonPressed(entry) {
    db.remove(entry);
  }

  // The input box when editing a entry has blurred, we should save
  // the new title or delete the entry if the title is empty
  function onEntryBlurred(entry, event) {
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
    db.replicate.to(remoteCouch, opts, showSynchronizationError);
    db.replicate.from(remoteCouch, opts, showSynchronizationError);
  }

  /**
   * Show sync error on UI.
   */
  function showSynchronizationError() {
    syncDom.setAttribute('data-sync-state', 'error');
  }

  /**
   * Display input box to edit an entry.
   * @param {*} entry 
   */
  function onEntryDoubleClicked(entry) {
    var div = document.getElementById('li_' + entry._id);
    var inputEditEntry = document.getElementById('input_' + entry._id);
    div.className = 'editing';
    inputEditEntry.focus();
  }

  // If they press enter while editing an entry, blur it to trigger save
  // TODO: Seems like a hack.
  function onEntryKeyPressed(entry, event) {
    if (!event.shiftKey && event.keyCode === ENTER_KEY) {
      var inputEditEntry = document.getElementById('input_' + entry._id);
      inputEditEntry.blur();
    }
  }

  function convertHashTagsToLinks(htmlContent) {
    return htmlContent.replace(/#(\w+)/g, '<a href="?hashtag=$1">#$1</a>');
  }

  /**
   * Builds an HTML list item (<li>) containing the entry.
   * @param {*} entry 
   * @returns HTML list item
   */
  function createEntryListItem(entry) {
    var datelabel = document.createElement('label');
    datelabel.className = 'datetime';
    datelabel.appendChild(document.createTextNode(
      new Date(entry.datetime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' })
    ));

    // Convert markdown to HTML
    let converter = new showdown.Converter({
      requireSpaceBeforeHeadingText: true, // Do not interpret "#Heading" as heading but only "# Heading".
      simpleLineBreaks: true, // Add <br> tags for single line breaks.
      simplifiedAutoLink: true, // Convert plain text URLs to links.
    });
    var htmlContent = converter.makeHtml(entry.content);

    htmlContent = convertHashTagsToLinks(htmlContent);

    var label = document.createElement('label');
    label.innerHTML = htmlContent;
    label.addEventListener('dblclick', onEntryDoubleClicked.bind(this, entry));

    var deleteLink = document.createElement('button');
    deleteLink.className = 'delete';
    deleteLink.addEventListener('click', onDeleteButtonPressed.bind(this, entry));

    var divDisplay = document.createElement('div');
    divDisplay.className = 'view';
    divDisplay.appendChild(datelabel);
    divDisplay.appendChild(label);
    divDisplay.appendChild(deleteLink);

    var inputEditEntry = document.createElement('textarea');
    inputEditEntry.id = 'input_' + entry._id;
    inputEditEntry.className = 'edit';
    inputEditEntry.innerHTML = entry.content;
    inputEditEntry.addEventListener('keypress', onEntryKeyPressed.bind(this, entry));
    inputEditEntry.addEventListener('blur', onEntryBlurred.bind(this, entry));

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
  function renderAllEntries(entrys) {
    var ul = document.getElementById('entry-list');

    ul.innerHTML = '';

    entrys.forEach(function (entry) {
      // Depending on whether db.find or db.allDocs was used, there is a nested doc element.
      var doc;
      if (entry.doc !== undefined) {
        doc = entry.doc;
      }else{
        doc = entry;
      }
      
      ul.appendChild(createEntryListItem(doc));
    });
  }

  /**
   * Adds a new entry when the user presses enter on the input field.
   * @param {*} event 
   */
  function onNewEntryKeyPressed(event) {
    if (!event.shiftKey && event.keyCode === ENTER_KEY) {
      addEntry(newEntryDom.value);
      newEntryDom.value = '';
    }
  }

  /**
   * Adds event listeners to the new-entry input box.
   */
  function addEventListeners() {
    newEntryDom.addEventListener('keypress', onNewEntryKeyPressed, false);
  }

  addEventListeners();
  let searchString = new URLSearchParams(window.location.search).get('hashtag');
  showAllEntries(searchString);

  if (remoteCouch) {
    initializeSynchronization();
  }
})();
