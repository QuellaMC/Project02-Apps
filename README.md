# Project02 Apps

The apps in the App Store on a [Project02](https://github.com/QuellaMC/Project02)
character's phone.

A character in Project02 has a phone of her own. She finds apps in its App
Store and asks before installing one; you can also give her one from
Settings. This repository is where those apps come from.

## What an app can do

An app is one JavaScript file. It runs inside Project02 and is handed only
what her phone gives it:

- a small store of its own data;
- rings, which can wake her when something is due, if the app says it
  wakes her and you allow it.

It cannot read your files, reach the network, or see anything else on your
computer. Every app here was read line by line before it was added.

## What is here

- `catalog.json` is the list the App Store reads: each app's name, what it
  is, its version, and the SHA-256 of its file.
- `apps/<id>/<version>.js` is one version of one app. A file here is never
  changed once it is published: a change is a new version in a new file,
  so the App Store always installs exactly the file its entry describes.

## Proposing an app

1. Write the app as one file. In the
   [Project02 repository](https://github.com/QuellaMC/Project02), the
   phone's README at `crates/p02-phone/README.md` says what a file exports
   and what `phone` gives it, and the Clock that comes with the phone,
   `crates/p02-phone/apps/clock.js`, is a complete example.
2. Try it: in Project02, open a character's Settings, then Apps, Get More
   Apps, From a File.
3. Open a pull request that adds `apps/<id>/<version>.js` and its entry in
   `catalog.json`. `node tools/check.mjs` says whether the two agree.

We read every line before an app goes in, so small and plain is welcome.
