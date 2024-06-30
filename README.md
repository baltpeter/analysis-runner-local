# `analysis-runner-local`

> Server for running mobile app analyses for the tweasel project using locally connected devices/emulators. 

This is an analysis runner for the [tweasel.org platform](https://github.com/tweaselORG/platform) that works with locally connected devices/emulators. It accepts analysis requests for the configured platform (Android emulator or iOS device) and reports the results back to the server running `platform`.

For each analysis request, the runner:

* Downloads the requested Android app using [apkeep](https://github.com/EFForg/apkeep) or iOS app using [ipatool](https://github.com/majd/ipatool).
* Runs a dynamic analysis of the requested app, capturing its network traffic using [cyanoacrylate](https://github.com/tweaselORG/cyanoacrylate).
* Detects tracking data transmissions in the recorded traffic using [TrackHAR](https://github.com/tweaselORG/TrackHAR), relying solely on the adapter-based workflow.

The server uses [Hono](https://hono.dev/) as the framework. Analysis requests are kept in a [better-queue](https://www.npmjs.com/package/better-queue) queue that is persisted in an SQLite database.

## Development

Thank you for your interest in contributing to the project! To run the it locally for development, follow these steps:

1. Install [Node.js](https://nodejs.org/en/download) and [Yarn 1](https://classic.yarnpkg.com/en/docs/install) (Classic) if you haven't done so already.
2. Install [appstraction's host dependencies](https://github.com/tweaselORG/appstraction#host-dependencies-for-android).
3. Set up a device or an emulator according to [appstraction's device preparation instructions](https://github.com/tweaselORG/appstraction?tab=readme-ov-file#device-preparation).
4. [Install and configure](#app-download-setup) the dependencies for downloading Android and/or iOS apps.
5. Clone the repo and run `yarn` in the root directory of the repo to fetch all required dependencies.
6. Copy the file [`config.sample.json`](config.sample.json) to `config.json` and edit it accordingly. Most values should be self-explanatory and you can refer to the [config schema](/src/lib/config.ts), but here are some notes:

   * `target` sets the [options for how cyanoacrylate](https://github.com/tweaselORG/cyanoacrylate/blob/main/docs/README.md#analysisoptions) talks to your device/emulator. These differ depending on the platform.
   * `analysisResultUrl` is the URL to the endpoint that accepts the analysis results on your locally running `platform` instance. In development, this should be `http://localhost:4321/private-api/analysis-result`.
   * `token` is a shared secret between the server and the runner. The runner only accepts requests with this token and the server only accepts results with this token. Thus, you need to set the same value in the `*_RUNNER_TOKEN` environment variable in your `platform` instance.
7. Finally, run `yarn dev` to start the server in development mode. It will be available at `http://localhost:3000` and automatically reload for any changes you make.

### App download setup

#### Downloading Android apps

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

#### Downloading iOS apps

For the analysis runner to be able to download iOS apps, you need to have [IPATool](https://github.com/majd/ipatool) installed and set up:

1. Install the [latest release of IPATool](https://github.com/majd/ipatool/releases) to your `$PATH`.
2. Log in using `ipatool auth login --email <email> --password <password>`.

You can test that everything works correctly by running:

```sh
ipatool download -b <bundle ID> --purchase
```

## License

This code is licensed under the MIT license, see the [`LICENSE`](LICENSE) file for details.

Issues and pull requests are welcome! Please be aware that by contributing, you agree for your work to be licensed under an MIT license.
