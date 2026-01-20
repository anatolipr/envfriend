# EnvFriend 🚀

EnvFriend is a lightweight utility for dynamic environment switching of front-end assets. It enables developers to load different versions of a project (e.g., specific staging branches or production tags) using URL parameters, localStorage overrides, or pre-defined configurations.


## Core Concepts

EnvFriend resolves a `{env}` placeholder in your URLs based on a priority hierarchy:

1. **LocalStorage Override:** Set manually for testing.
1. **URL Parameter:** Specifically the _imenvt_ query string.
1. **Default:** Falls back to production.

## 1. Project Configuration (environment.js)
Define your project identity and the list of valid environments. This file is imported by the common utilities.

```JavaScript
// environment.js
export const project = "other/xm";

export const environments = {
  configuration: {
    environments: [
      { id: "production" },
      { id: "stage5" },
      { id: "stage39" },
      { id: "stage6" }
    ],
  },
};
```

## 2. Utility Wrapper (loader.mjs)
EnvFriend is only a middleware. To achieve full loader effect you need to utilize it's API and adapt it according to your needs. Below is a sample completed loader approach. You can use these helper functions to lazily load the EnvFriend library and resolve versioned assets.

```JavaScript
import { project, environments } from './environment.js';

const ENV_FRIEND = "https://js-cdn.impact.com/npm/envfriend@0.0.16/dist/tool.js";

function getCdnUrlTemplate(file) {
    return `https://ui.assets.impact.com/${project}/{env}/${file}.js`;
}

/**
 * Ensures EnvFriend is loaded in the global scope
 */
export async function loadEnvironmentFriendIfNeeded() {
    return new Promise((resolve) => {
        if (!window.__envfriend) {
            const script = document.createElement("script");
            script.setAttribute("src", ENV_FRIEND);
            script.setAttribute("type", "module");
            script.onload = () => resolve();
            document.head.appendChild(script);
        } else {
            resolve();
        }
    });
}

/**
 * Resolves a versioned URL and imports it as a module
 */
export async function importForEnvironment(file) {
    await loadEnvironmentFriendIfNeeded();
    const url = await window.__envfriend.getEnvironmentUrl(
        getCdnUrlTemplate(file), { project, environments }
    );
    return import(url);
}

/**
 * Injects a script into the DOM and mounts a component
 */
export default async function loadAndMount(params) {
    const { file, globalName, props, target } = params;
    await loadEnvironmentFriendIfNeeded();
    
    const url = await window.__envfriend.getEnvironmentUrl(
        getCdnUrlTemplate(file), { project, environments }
    );

    return new Promise((resolve) => {
        let script = document.createElement("script");
        script.setAttribute("src", url);
        script.setAttribute("type", "module");
        script.onload = () => {
            if (globalThis[globalName || file]) {
                globalThis[globalName || file](props || {}).mount(target);
            }
            resolve();
        };
        document.head.appendChild(script);
    });
}
```

## 3. Usage & Testing
#### Loading a Module

```JavaScript
import { importForEnvironment } from './common.mjs';

const myModule = await importForEnvironment('my-feature');
```

#### Forcing an Environment

#### 1. Testing Local Development
If you are developing a module locally (e.g., on port 8080) and want the host application to fetch your local files instead of CDN files, run this in your browser console:

```JavaScript
// This tells EnvFriend to replace {env} logic with your local path
__envfriend.overrideCurrentEnvironment('other/xm', 'http://localhost:8080');

// Refresh the page to see the changes take effect
location.reload();
```

**How it works**: When the environment string starts with http, EnvFriend extracts the filename from your template and appends it to your local URL.

- **Template**: `https://ui.assets.impact.com/other/xm/{env}/main.js`

- **Resolved**: `http://localhost:8080/main.js`

#### 2. Testing Staging Environments
You can switch between different staging environments defined in your `environment.js` without modifying code:

| Method | Action |
|---|---|
|**URL Parameter**| Append `?_imenvt_=stage5` to your URL. |
|**Console Command**|`__envfriend.overrideCurrentEnvironment('other/xm', 'stage5')`|
|**Reset to Default**|`__envfriend.overrideCurrentEnvironment('other/xm', null)`|

URL parameter is usually used when the page is iframed and the environment is only known to it's parent document.


## 4. API Reference
If you need to interact with the core library directly via the global `window.__envfriend` object:

- `appendEl(vdomEls, opts)`: Injects elements into the DOM (scripts/links) after resolving {env} placeholders in their attributes.

- `getEnvironmentUrl(template, opts)`: An async function that returns a string with {env} replaced by the resolved environment path.

- `getCurrentEnvironmentString(project)`: Returns the active environment ID (e.g., "production", "stage6").

- `log`: An array containing the execution history for debugging purposes.

## 5. Environment Resolution Logic

- **Standard**: Replaces `{env}` with the id (or bucketPath if provided).

- **Bang Syntax**: If the env is !my-branch, it strips the ! and uses my-branch.

- **URL Override**: If the resolved environment is a full URL (starting with http), it prepends that URL to the filename in the template. 

## Integration considerations
- Applications using envFriend will typically share the environment the code is running on in the global variable `_imenvt_`.

- Typical uses of envFriend would also include Github environment configuration which is then wired in a deployment workflow / github action. You can see an example [here](https://gist.github.com/anatolipr/6235eeeab4d0cfda610440cf31f99db1)

## Chrome Extension
envFriend has a browser extension which supports environment overrides using UI, instead of console commands.
See more here: https://github.com/anatolipr/envfriendext
