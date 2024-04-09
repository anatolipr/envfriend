((window) => {
    const functions = {};
    let configCache = {};
    functions.configCache = configCache;
    window.__envfriend = functions;
    functions.overrideCurrentEnvironment = function (envName, override) {
        const date = !!override
            ? 'Fri, 31 Dec 9999 23:59:59 GMT'
            : 'Thu, 01 Jan 1970 00:00:01 GMT';
        document.cookie = `_imenvt_${envName}=${override}; expires=${date}; path=/`;
        console.log('Overrde applied', override);
    };
    functions.getCurrentEnvironmentString = function (envName) {
        let override = document.cookie.match(new RegExp(`(^| )_imenvt_${envName}=([^;]+)`))?.[2];
        return override || window._imenvt_ || 'production';
    };
    functions.getFilenameFromURL = function (url) {
        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        return filename?.indexOf('.') > -1 ? filename : '';
    };
    /**
     * append element in DOM
     * @param vdomEls eg. [
        {
            "el": "script", "target": "body", "attrs": [["src", "...."]]
        }
    ]
    */
    functions.appendEl = function (vdomEls) {
        vdomEls.forEach((elDef) => {
            const el = document.createElement(elDef.el);
            (elDef.attrs || []).forEach((attrDef) => {
                el.setAttribute(attrDef[0], attrDef[1]);
            });
            document.querySelector(elDef.target || 'head').appendChild(el);
        });
    };
    functions.getEnvironmentUrl = async function (template, projectName) {
        const env = functions.getCurrentEnvironmentString(projectName);
        if (env.match(/^https?:/i)) {
            return env + '/' + functions.getFilenameFromURL(template);
        }
        let configUrl = `https://ui.impact.com/${projectName}/environments.json`;
        //cache
        if (configCache[projectName] === undefined) {
            const conf = await fetch(configUrl).then(r => r.json());
            configCache[projectName] = conf?.configuration?.environments
                .reduce((acc, v) => {
                acc[v.id] = v;
                return acc;
            }, {}) || {};
        }
        const currentConfig = configCache[projectName];
        if (currentConfig[env] !== undefined) {
            return template.replaceAll('{env}', currentConfig[env].bucketPath || currentConfig[env].id);
        }
        else {
            return template.replaceAll('{env}', currentConfig['production']?.bucketPath || currentConfig['production']?.id || 'production');
        }
    };
})(globalThis);
