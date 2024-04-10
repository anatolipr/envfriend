((window: any) => {

  const functions: any = {};
  functions.host = 'https://ui.impact.com'
  functions.log = [];

  type Environment = {
    id: string,
    bucketPath?: string
  }

  type EnvironmentMap = {
    [k: string]: Environment;
  };

  type EnvironmentsFile = {
    configuration: {
      environments: Environment[];
    };
  };

  type attrsArray = [string, string][];
  type elDef = {
    el: string,
    target: string,
    attrs: attrsArray
  }

  type Options = {
    /**
     * path of the project on CDN. Used to determine how to access 
     * environments.json file when the environments option (below) is missing.
     * NOTE: "project" is also used as a key for caching the environment configuratoin.
     * This is especially helpful when you have no inline configuration and multiple
     * fetch requests to environments.json URL for the same project on the page.  
     */
    project: string,
    /**
     * inline environment connfiguration JSON. if not specified
     * the app will attempt to use the definition from an url composed like this:
     * http://your-cdn-host.com/${project}/enrivornments.json
     * where http://your-cdn-host.com is a value available as the host option.
     * Default is https://ui.impact.com
     */
    environments: EnvironmentsFile,
    /**
     * potential override for the default host eg. https://cdn.example.com
     */
    host: string
  }

  let configCache: {[k:string]: EnvironmentMap} = {};
  functions.configCache = configCache;

  (window as any).__envfriend = functions;

  /**
   * override what would be usually determined using _imenvt_ value and environments config
   * @param project - this project 
   * @param override - new override value
   */
  functions.overrideCurrentEnvironment = function(project: string, override: string): void {
    
    if (!project) {
      throw "project parameter is required"
    }

    const date = !!override
      ? 'Fri, 31 Dec 9999 23:59:59 GMT'
      : 'Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = `_imenvt_${project}=${override}; expires=${date}; path=/`;

    console.log('Overrde applied', override)
  }

  /**
   * For internal use / debugging
   * 
   * Returns the string value for the current environment / environment name
   * as a default it will return the window._imenvt_ value. 
   * If window._imenvt_ is undefined it will return "production".
   * 
   * When overrideCurrentEnvironment was called the returned value will be the 
   * overriden value. Eg. if window._imenvt_ is "stage1" but 
   * overrideCurrentEnvironment('prod') happened it will return "stage1"
   * 
   * @param project 
   * @returns environment string - eg. "production", "stage1"
   */
  functions.getCurrentEnvironmentString = function(project: string): string {

    if (!project) {
      throw "project parameter is required"
    }

    let override = document.cookie.match(
      new RegExp(`(^| )_imenvt_${project}=([^;]+)`)
    )?.[2];
    return override || (window as any)._imenvt_ || 'production';
  }

  functions.getFilenameFromURL = function(url: string): string | '' {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename?.indexOf('.') > -1 ? filename : '';
  }

  /**
   * append element in DOM by replacing attributes which contain {env} with the current 
   * environment string
   * @param vdomEls eg. [
      {
          "el": "script", "target": "body", "attrs": [["src", "...."]]
      }
  ]
  */
  functions.appendEl = async function(vdomEls: elDef[], opts: Options): Promise<void> {

      for (let i = 0; i < vdomEls.length; i++) {
        const elDef = vdomEls[i];
        const el = document.createElement(elDef.el);

        for (let b = 0; b < (elDef.attrs||[]).length; b++) {
          
          const attrDef = elDef.attrs[b];

          el.setAttribute(attrDef[0], 
            (attrDef[1] || '').indexOf('{env}') === -1 ? attrDef[1] 
              : await functions.getEnvironmentUrl(attrDef[1], opts));
          
        }

        document.querySelector(elDef.target || 'head')!.appendChild(el);
        functions.log.push({f: 'appendEl', p: {vdomEls, opts}})
      }
  }
  
  
  /**
   * replaces a string which has {env} with the relevant current environment
   * @param template 
   * @param projectName 
   * @param environments 
   * @returns 
   */
  functions.getEnvironmentUrl = async function (template: string, opts: Options): Promise<string> {
    
    const env = functions.getCurrentEnvironmentString(opts.project);

    if (env.match(/^https?:/i)) {
      return env + '/' + functions.getFilenameFromURL(template);
    }

    let configUrl = `${opts.host || functions.host}/${opts.project}/environments.json`;
    
    //cache
    if (configCache[opts.project] === undefined) {
      const conf: EnvironmentsFile = opts.environments || await fetch(configUrl)
      .then(r => r.json()).catch(e => {
        functions.log.push({f: "getEnvironmentUrl->fetch", template, project: opts.project, e})
        return {}
      });
      configCache[opts.project] = conf?.configuration?.environments
        .reduce((acc: EnvironmentMap, v: Environment) => {
          acc[v.id] = v;
          return acc;
        }, {}) || {};
    }

    const currentConfig = configCache[opts.project];

    if (currentConfig[env] !== undefined) {
      return template.replaceAll('{env}', currentConfig[env].bucketPath || currentConfig[env].id)
    } else {
      return template.replaceAll('{env}',
        currentConfig['production']?.bucketPath || currentConfig['production']?.id || 'production'
      )
    }

  }

})(globalThis)
