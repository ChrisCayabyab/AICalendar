
<!-- GETTING STARTED -->
## Getting Started

you can run your evo-calendar google api with these steps

### First Time Set up

Run **npm install** when on the project directory after cloning

- (delete token.json file first)

- In the google Cloud console, Enable the calendar API. Click [here](https://console.cloud.google.com/flows/enableapi?apiid=calendar-json.googleapis.com)

Next, We Authorize credentials for the desktop app:

- In the Google Cloud console, go to Menu menu > APIs & Services > Credentials
- Click Create Credentials > OAuth client ID.
- Click Application type > Desktop app.
- In the Name field, type a name for the credential. This name is only shown in the Google Cloud console.
- Click Create. The OAuth client created screen appears, showing your new Client ID and Client secret.
- Click OK. The newly created credential appears under OAuth 2.0 Client IDs.
- Save the downloaded JSON file as credentials.json, and move the file to your working directory.

### To run the website

Run "node ." when on the project directory and website app.