import { test, expect, vi, describe } from 'vitest';

import  './tool.ts'


declare global {
    interface Window {
        __envfriend: any;
        _imenvt_: string | undefined;
    }
}

global.fetch = vi.fn()

function createFetchResponse(data: {}) {
    return { json: () => new Promise((resolve) => resolve(data)) }
}


test('getCurrentEnvironmentString overrideCurrentEnvironment', () => {

    expect(window._imenvt_).toBeUndefined();
    expect( window.__envfriend.getCurrentEnvironmentString('sales') ).toBe('production');

    window._imenvt_ = 'stage23';
    expect( window.__envfriend.getCurrentEnvironmentString('sales') ).toBe('stage23');

    expect(window._imenvt_).toBe('stage23');

    window.__envfriend.overrideCurrentEnvironment('sales','foo');
    expect(window._imenvt_).toBe('stage23');
    expect( window.__envfriend.getCurrentEnvironmentString('sales') ).toBe('foo');

    window.__envfriend.overrideCurrentEnvironment('sales');
    expect( window.__envfriend.getCurrentEnvironmentString('sales') ).toBe('stage23');
    
});

test('getFilenameFromURL', () => {

    expect(window.__envfriend.getFilenameFromURL('https://www.example.com/path/file1.txt')).toBe('file1.txt')

})

const mockConfig: {} = {
    "name": "sales",
    "configuration": {
        "environments": [
        {
            "id": "production",
            "bucketPath": "pd1"
        },
        {
            "id": "stage27"
        },
        {
            "id": "customFoobar",
            "name": "Foo",
            "bucketPath": "anyStageTesting",
            "usageNote": "Used for all"
        },
        {
            "id": "development",
            "bucketPath": "http://localhost:5000/"
        }
        ]
    }};

test('', async () => {

    window._imenvt_ = undefined;
    expect(window._imenvt_).toBeUndefined();

    (fetch as any).mockResolvedValue(createFetchResponse(mockConfig))
    
    let replaced = await window.__envfriend.getEnvironmentUrl('https://example.com/{env}/index.html', 'squad1')
    expect(replaced).toBe('https://example.com/pd1/index.html')

    expect(fetch).toHaveBeenLastCalledWith(`https://ui.impact.com/squad1/environments.json`);
    

    //test value not in config
    window._imenvt_ = 'unknown';


    let replaced2 = await window.__envfriend.getEnvironmentUrl('https://example.com/{env}/index.html', 'squad1')
    //first fetch will be cached
    expect(fetch).toBeCalledTimes(1);
    
    expect(replaced2).toBe('https://example.com/pd1/index.html')

    //test id

    window._imenvt_ = 'stage27';
    let replaced3 = await window.__envfriend.getEnvironmentUrl('https://example.com/{env}/index.html', 'squad1')
    expect(replaced3).toBe('https://example.com/stage27/index.html')


})



/*TODO
- test failing fetch
- incorrect configuration json
- missing configuration json
- invalid response
*/