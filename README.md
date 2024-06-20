```
npm install
npm run dev
```

```
open http://localhost:3000
```

## Setup

### Downloading Android apps

For the analysis runner to be able to download Android apps, you need to have [apkeep](https://github.com/EFForg/apkeep) installed and set up:

1. Install using `cargo install apkeep`.
2. Fetch an `oauth_token` by going to <https://accounts.google.com/embedded/setup/v2/android> and logging in. Once you click "I agree" on the last page, a cookie called `oauth_token` will be placed (value starts with `oauth2_4/0`). The website will continue loading forever, but the cookie is already valid.
3. Run `apkeep -e '<email>' --oauth-token '<oauth_token>'`. This should print an AAS token.
4. Create `~/.config/apkeep/apkeep.ini` with the following contents:

   ```ini
   [google]
   email = <email>
   aas_token = <AAS token>
   ```

You can test that everything works correctly by running:

```sh
apkeep -a <app ID> -d google-play -o device=px_3a,locale=en_DE,include_additional_files=1,split_apk=1 <out dir>
```

### Downloading iOS apps

For the analysis runner to be able to download iOS apps, you need to have [IPATool](https://github.com/majd/ipatool) installed and set up:

1. Install the [latest release of IPATool](https://github.com/majd/ipatool/releases) to your `$PATH`.
2. Log in using `ipatool auth login --email <email> --password <password>`.

You can test that everything works correctly by running:

```sh
ipatool download -b <bundle ID> --purchase
```
