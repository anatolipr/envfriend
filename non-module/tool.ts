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

  let configCache: {[k:string]: EnvironmentMap} = {};
  functions.configCache = configCache;

  (window as any).__envfriend = functions;

  functions.overrideCurrentEnvironment = function(envName: string, override: string): void {
    
    const date = !!override
      ? 'Fri, 31 Dec 9999 23:59:59 GMT'
      : 'Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = `_imenvt_${envName}=${override}; expires=${date}; path=/`;

    console.log('Overrde applied', override)
  }

  functions.getCurrentEnvironmentString = function(envName: string): string {
    let override = document.cookie.match(
      new RegExp(`(^| )_imenvt_${envName}=([^;]+)`)
    )?.[2];
    return override || (window as any)._imenvt_ || 'production';
  }

  functions.getFilenameFromURL = function(url: string): string | '' {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename?.indexOf('.') > -1 ? filename : '';
  }

  /**
   * append element in DOM
   * @param vdomEls eg. [
      {
          "el": "script", "target": "body", "attrs": [["src", "...."]]
      }
  ]
  */
  functions.appendEl = function(vdomEls: elDef[], 
      projectName: string, 
      environments?: EnvironmentsFile): void {

    vdomEls.forEach((elDef) => {
      const el = document.createElement(elDef.el);
      (elDef.attrs || []).forEach(async (attrDef) => {
        el.setAttribute(attrDef[0], 
          await functions.getEnvironmentUrl(attrDef[1], projectName, environments));
      });
      document.querySelector(elDef.target || 'head')!.appendChild(el);
      functions.log.push({f: 'appendEl', p: {vdomEls, projectName, environments}})
    });
    
  }
  
  functions.getEnvironmentUrl = async function (template: string, projectName: string, environments?: EnvironmentsFile): Promise<string> {

    const env = functions.getCurrentEnvironmentString(projectName);

    if (env.match(/^https?:/i)) {
      return env + '/' + functions.getFilenameFromURL(template);
    }

    let configUrl = `${functions.host}/${projectName}/environments.json`;
    
    //cache
    if (configCache[projectName] === undefined) {
      const conf: EnvironmentsFile = environments || await fetch(configUrl)
      .then(r => r.json()).catch(e => {
        functions.log.push({f: "getEnvironmentUrl->fetch", template, projectName, e})
        return {}
      });
      configCache[projectName] = conf?.configuration?.environments
        .reduce((acc: EnvironmentMap, v: Environment) => {
          acc[v.id] = v;
          return acc;
        }, {}) || {};
    }

    const currentConfig = configCache[projectName];

    if (currentConfig[env] !== undefined) {
      return template.replaceAll('{env}', currentConfig[env].bucketPath || currentConfig[env].id)
    } else {
      return template.replaceAll('{env}',
        currentConfig['production']?.bucketPath || currentConfig['production']?.id || 'production'
      )
    }

  }

})(globalThis)
