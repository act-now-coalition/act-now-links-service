# Act Now Links Service

Service to generate sharable links with meta tags and dynamic preview images.

## Contents

[API](#api)

* [Creating a share link](#creating-a-share-link)
* [Taking a screenshot of a share image page](#taking-a-screenshot-of-a-share-image-page)
* [Fetching an existing share link by its original URL](#fetching-an-existing-share-link-by-its-original-url)

[Setup](#setup)

* [Getting started](#getting-started)
* [Running emulators for local development](#running-emulators-for-local-development)
* [Deploying changes](#deploying-changes)

## API

API base URL: `https://us-central1-act-now-links-dev.cloudfunctions.net`

### Creating a share link

Registers a new share link, or updates the existing one if a share link already exists for the supplied URL,
with meta tags according to the request body params. On success, returns the URL of the new or updated share link.

#### Request

* URL:  `/api/registerUrl`
* Method: `POST`
* Headers
  * Required: `Content-Type:application/json`

##### Data Parameters

|     Parameter      | Data Type | Description | Required |
| ----------- | ----------- | ---------------| ------------|                 
| `url`      | `string`      |  Url to create share link for | `true` |
| `title`   | `string`        | Title meta tag                 | `false` |
| `description`   | `string`        | Description meta tag  | `false` |
| `imageUrl`   | `string`        | Url of image to use as image meta tag | `false` |


#### Success response

Returns new or updated share link for the URL provided with meta tags according to the data params.

* **Code:** `200 <br />`
* **Content:** `<share link URL>`
 
#### Error Response

* **Code:** `500 Internal Server Error <br />`
* **Code:** `400 Missing url argument. <br />`


#### Example

##### `./payload.json`

```json
{
  "url": "https://www.covidactnow.org",
  "title": "Covid Act Now - US Covid Data Tracker",
  "description": "See how Covid is spreading in your community",
  "imageUrl": "https://covidactnow.org/internal/share-image/states/ma"
}
```

```bash
curl -X POST -H "Content-Type:application/json" <baseurl>/api/registerUrl -d @./payload.json
```

### Taking a screenshot of a share image page

Generates a screenshot of the given target URL and returns the image. Target URL should be encoded using JavaScript's `encodeURIComponent()` function.

The target URL must contain `<div>`s with `screenshot` and `screenshot-ready` classes to indicate where to capture and when the screenshot is ready to be taken, e.g.:

 ```html
<div class="screenshot">
  <div class="screenshot-ready">
    {content to screenshot}
  </div>
</div>
 ```

 We can combine this endpoint with `/api/registerUrl` to create share links with dynamic images by
 supplying an `api/screenshot/` URL as the `imageUrl` data param when creating a new share link.

#### Request

* URL:  `/api/screenshot/<encoded-target-URL>`
* Method: `GET`

#### Success Response

Serves screenshot of targeted URL to request URL.

* **Code:** `200 <br />`
* **Content:** `<screenshot of target URL as .PNG>`
 
#### Error Response

* **Code:** `500 Internal Server Error <br />`

#### Example

```bash
wget -O img.png "<baseurl>/api/screenshot/https://covidactnow.org/internal/share-image/states/ma"
```

### Fetching an existing share link by its original URL

If it exists, return the share link with the same URL as the supplied original URL. The original URL should be encoded using JavaScript's `encodeURIComponent()` function.


#### Request

* URL:  `/api/getShareLinkUrl/<encoded-original-URL>`
* Method: `GET`

#### Success Response

Returns the corresponding share link for the URL provided.

* **Code:** `200 <br />`
* **Content:** `<share link URL>`

#### Error Response

If a share link does not exist for the original URL a 404 is returned.

* **Code:** `400 No share link exists for this URL.`
* **Code:** `500 Internal Server Error <br />`

#### Example

```bash
curl -X GET "https://us-central1-act-now-links-dev.cloudfunctions.net/api/getShareLinkUrl/https://www.covidactnow.org"
```

## Setup

### Getting Started

To get setup:

* If applicable, make sure you have access to the `act-now-links-dev` Google Firebase project.
* Clone the repo with: `git clone https://github.com/covid-projections/act-now-links-service.git`
* Move to the repo directory: `cd act-now-links-service`
* Install firebase tools and CLI: `yarn global add firebase-tools`
* Login to firebase: `firebase login`, this will open a browser to sign in through in order to give you authentication to interact with the project.
* `cd functions/ && yarn dev`

### Running emulators for local development

For local development, we can run emulators such that we do not need to deploy our changes to the production at every step.

This project uses Firestore and Functions, so we will only need to configure emulators for these services. To do so:

* Run `firebase init emulators` and select `functions` and `firestore` from the dropdown selections with spacebar, and confirm selections with enter.
* Once the setup has completed, we can start the emulator with `firebase emulator:start`. The firestore emulator relies on Java, so if you encounter an error like ```The operation couldn’t be completed. Unable to locate a Java Runtime.``` it is either because you do not have Java installed, or the installation cannot be found.
  * If you do not have Java installed, install it with `brew install Java` (on Mac). On completion, run `java`; if the same error is raised as above, follow the next step, otherwise skip it.
  * To locate/link to your Java installation run `sudo ln -sfn /opt/homebrew/opt/openjdk/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk.jdk` (see this [StackOverflow post](https://stackoverflow.com/questions/65601196/how-to-brew-install-java) for context).
  * Re-run `firebase emulator:start` to hopefully see that the start is successful.
* Once the emulators are running you can interact with the local instance the same as you would production, following the ports/locations specified by the displayed in the terminal. By default, the functions emulator is set to run on `localhost:5001`, creating endpoints at `localhost:5001/act-now-links-dev/central-us1/api`.
* The emulator will update whenever the project is built. We can have changes applied on save by running `yarn build:watch` in `functions/` in a separate terminal window.

### Deploying changes

We don't yet have a system for deploying changes to production. To deploy any changes to your functions, after making sure you're authorized by using `firebase login`, run `yarn deploy`.
