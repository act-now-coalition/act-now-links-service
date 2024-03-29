# Act Now Links Service

Service to generate sharable links with meta tags and dynamic preview images.

## Contents

[API](#api)

- [Creating a share link](#creating-a-share-link)
- [Taking a screenshot of a share image page](#taking-a-screenshot-of-a-share-image-page)
- [Fetching an existing share link by its original URL](#fetching-an-existing-share-link-by-its-original-url)

[Setup](#setup)

- [Getting started](#getting-started)
- [Running emulators for local development](#running-emulators-for-local-development)
- [Deploying changes](#deploying-changes)

[Insomnia](#insomnia)

- [Using Insomnia to explore and debug the API](#insomnia)

## API

API base URL: `https://share.actnowcoalition.org`

### Creating a share link

Registers a new share link with meta tags according to the request body params, or returns the existing one if a share link already exists for the supplied parameters. On success, returns the URL of the new or existing share link.

Requires a valid API key. If you do not have a key and would like to register one, or you have forgotten yours, please reach out to us.

#### Request

- URL: `/api/registerUrl`
- Method: `POST`
- Headers
  - Required: `Content-Type: 'application/json'`

##### Data Parameters

| Parameter     | Data Type | Description                                                                                                         | Required |
| ------------- | --------- | ------------------------------------------------------------------------------------------------------------------- | -------- |
| `url`         | `string`  | Url to create share link for                                                                                        | `true`   |
| `title`       | `string`  | Title meta tag                                                                                                      | `false`  |
| `description` | `string`  | Description meta tag                                                                                                | `false`  |
| `imageUrl`    | `string`  | Url of image to use as image meta tag                                                                               | `false`  |
| `imageHeight` | `number`  | Height of preview image (imageUrl) in pixels                                                                        | `false`  |
| `imageHeight` | `number`  | Width of preview image (imageUrl) in pixels                                                                         | `false`  |
| `apiKey`      | `string`  | Valid API key to authorize the request. <br/> Can also be passed as a query parameter using `?apiKey=API_KEY_HERE`. | `true`   |

#### Success response

Returns new or existing share link for the URL provided with meta tags according to the data params.

- **Code:** `200`
- **Content:** `<share link URL>`

#### Error Response

- **Code:** `400 Missing or invalid URL parameter. <br />`

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
curl -v -X POST -H "Content-Type:application/json" https://share.actnowcoalition.org/registerUrl?apiKey=API_KEY_HERE -d @./payload.json
```

### Fetching all existing share links for a URL

Returns all the share links with the same URL as the supplied target URL, or an empty
object if none exist.

#### Request

- URL: `/api/shareLinksByUrl?url=<target-URL>`
- Method: `GET`

#### Success Response

Returns all corresponding share links for the URL provided.

- **Code:** `200`
- **Content:** `{ urls: {share-link-url: { share-link-fields }} }`

#### Example

```bash
curl -v -X GET "https://share.actnowcoalition.org/shareLinksByUrl?url=https://www.covidactnow.org"
```

### Taking a screenshot of a share image page

Generates a screenshot of the given target URL and returns the image.

The target page must contain an element with `screenshot` as a CSS class name to indicate where the
screenshot will be captured. Because components on the target page can take time to load, the endpoint also uses specific class names to tell when the page is ready to be captured. The screenshot is captured when:

- an instance of the `act-now-component-loaded` CSS class is detected on the page
- no instances of the `act-now-component-loading` CSS classes are detected

If you are capturing a page with multiple components that take time to load, append `act-now-component-loading` classes to the components while they are loading, and `act-now-component-loaded` classes when they finish loading. To see how this can be implemented, see an example [`act-now-packages` component](https://github.com/act-now-coalition/act-now-packages/blob/develop/src/ui-components/components/MetricDot/MetricDot.tsx#L42).

We can combine this endpoint with `/api/registerUrl` to create share links with dynamic images by
supplying an `api/screenshot/` URL as the `imageUrl` data param when creating a new share link.

#### Request

- URL: `/api/screenshot?url=<target-URL>`
- Method: `GET`

#### Success Response

Serves screenshot of targeted URL to request URL.

- **Code:** `200`
- **Content:** `<screenshot of target URL as .PNG>`

#### Example

```bash
curl -v -X GET "https://share.actnowcoalition.org/screenshot?url=https://covidactnow.org/internal/share-image/states/ma" > img.png
```

## Setup

### Getting Started

To get setup:

- If applicable, make sure you have access to the `act-now-links-dev` Google Firebase project.
- Clone the repo with: `git clone https://github.com/covid-projections/act-now-links-service.git`
- Move to the repo directory: `cd act-now-links-service`
- Install firebase tools and CLI: `yarn global add firebase-tools`
- Login to firebase: `firebase login`, this will open a browser to sign in through in order to give you authentication to interact with the project.
- Make sure that you are using Node 16
- `cd functions/ && yarn`
- Run `yarn serve` to start the emulators

### Running emulators for local development

For local development, we can run emulators such that we do not need to deploy our changes to the production at every step.

- Start the emulators with `firebase emulator:start`. The firestore emulator relies on Java, so if you encounter an error like `The operation couldn’t be completed. Unable to locate a Java Runtime.` it is either because you do not have Java installed, or the installation cannot be found.
  - If you do not have Java installed, install it with `brew install Java` (on Mac). On completion, run `java`; if the same error is raised as above, follow the next step, otherwise skip it.
  - To locate/link to your Java installation run `sudo ln -sfn /opt/homebrew/opt/openjdk/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk.jdk` (see this [StackOverflow post](https://stackoverflow.com/questions/65601196/how-to-brew-install-java) for context).
  - Re-run `firebase emulator:start` to hopefully see that the start is successful.
- Once the emulators are running you can interact with the local instance the same as you would production, following the ports/locations specified in the terminal. By default, the functions emulator is set to run on `localhost:5001`, creating endpoints at `localhost:5001/act-now-links-dev/central-us1/api`.
- The emulator will update whenever the project is built. We can have changes applied on save by running `yarn build:watch` in `functions/` in a separate terminal window.

### Deploying changes

Deploys are handled automatically by the [Firebase functions deploy](https://github.com/covid-projections/act-now-links-service/actions/workflows/functions-deploy.yml) Github action. The workflow is triggered on pushes to the `main` and `develop` branches so that the deployed functions will reflect the most up-to-date status of the repository.

If need be, you can deploy functions yourself by running `yarn deploy` in `functions/`, but this is generally discouraged as it disrupts the symmetry between Github and Firebase.

## Insomnia

Insomnia can be used to test, debug, and store requests. To download and install the Insomnia client see https://insomnia.rest/download.

To work with the Act Now Links Service API in Insomnia, go to the main dashboard screen (e.g. by clicking "Insomnia" at the top of the screen) and select `Create > Import From > File` and select [`functions/insomnia-config.yaml`](./functions/insomnia-config.yaml).
