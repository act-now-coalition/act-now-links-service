# Share Links
Service to generate sharable links with meta tags and dynamic preview images.

# API

API base-URL: `https://us-central1-act-now-links-dev.cloudfunctions.net`

## Create a share link:

Registers a new share link, or updates the existing one if a share link for the supplied URL already exists,
with meta tags according to the request body params. On success, returns the URL of the new or updated share link.

* ### URL:  `/api/registerUrl`

* ### Method: `POST`

* ### Headers:

    #### Required: `Content-Type:application/json`

* ### Data Params:
    |     Parameter      | Data Type | Description |
    | ----------- | ----------- | ---------------|                
    | `url`      | `string`      |  Url to create share link for |
    | `title`   | `string`        | Title meta tag                 |
    | `description`   | `string`        | Description meta tag  |
    | `imageUrl`   | `string`        | Url of image to use as image meta tag |


* ### Success Response:
    Returns new or updated share link for the URL provided with meta tags according to the data params.
  * **Code:** 200 <br />
    **Content:** `<share link URL>`
 
* **Error Response:**

  * **Code:** 500 Internal Server Error <br />
  * **Code:** 400 Missing url argument. <br />


* **Sample Call:**

    *`./payload.json`*
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


## Take a Screenshot of a Share Image Page:
Generates a screenshot of the given target URL and returns the image.

The target URL must contain `<div>`s with `screenshot` and `screenshot-ready` classes
to indicate where to capture and when the screenshot is ready to be taken, e.g.:
 ```html
  <div class="screenshot">
    <div class="screenshot-ready">
      {content to screenshot}
    </div>
  </div>
 ```

 We can combine this endpoint with `/api/registerUrl` to create share links with dynamic images by
 supplying an `api/screenshot/` URL as the `imageUrl` data param when creating a new share link.

* ### URL:  `/api/screenshot/<target-URL>`

* ### Method: `GET`

* ### Success Response:
    Serves screenshot of targeted URL to request URL. 
  * **Code:** 200 <br />
    **Content:** `<screenshot of target URL as .PNG>`
 
* **Error Response:**

  * **Code:** 500 Internal Server Error <br />

* **Sample Call:**

    ```bash
    wget -O image.ong "<baseurl>/api/screenshot/https://covidactnow.org/internal/share-image/states/ma"
    ```

## Retrieve an Existing Share Link By Its Orignal URL:

If it exists, return the share link with the same URL as the supplied original URL.

* ### URL:  `/api/getShareLinkUrl/<original-URL>`

* ### Method: `GET`

* ### Success Response:
    Returns the corresponding share link for the URL provided.
  * **Code:** 200 <br />
    **Content:** `<share link URL>`
 
* **Error Response:**

    If a share link does not exist for the original URL a 404 is returned.

  * **Code:** 400 No share link exists for this URL.
  * **Code:** 500 Internal Server Error <br />

* **Sample Call:**

    ```bash
    wget -O image.ong "<baseurl>/api/screenshot/https://covidactnow.org/internal/share-image/states/ma"
    ```