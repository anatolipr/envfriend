import { test, expect, vi, describe } from 'vitest';

import  './tool.ts'
import { hostname } from 'os';


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
});

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

test('test retrieval from configuration url', async () => {

    window._imenvt_ = undefined;
    expect(window._imenvt_).toBeUndefined();

    (fetch as any).mockResolvedValue(createFetchResponse(mockConfig))
    
    let replaced = await window.__envfriend.getEnvironmentUrl('https://example.com/{env}/index.html', {project: 'squad1/projectX'})
    expect(replaced).toBe('https://example.com/pd1/index.html')

    expect(fetch).toHaveBeenLastCalledWith(`https://ui.impact.com/squad1/projectX/environments.json`);
    

    //test value not in config
    window._imenvt_ = 'unknown';


    let replaced2 = await window.__envfriend.getEnvironmentUrl('https://example.com/{env}/index.html',{project: 'squad1/projectX'})
    //first fetch will be cached
    expect(fetch).toBeCalledTimes(1);
    
    expect(replaced2).toBe('https://example.com/pd1/index.html')

    //test id

    window._imenvt_ = 'stage27';
    let replaced3 = await window.__envfriend.getEnvironmentUrl('https://example.com/{env}/index.html', {project:'squad1'})
    expect(replaced3).toBe('https://example.com/stage27/index.html')

})

test('override host', async () => {

    window._imenvt_ = undefined;
    expect(window._imenvt_).toBeUndefined();

    (fetch as any).mockResolvedValue(createFetchResponse(mockConfig))
    
    let replaced = await window.__envfriend.getEnvironmentUrl('https://example.com/{env}/index.html', 
    {project: 'testConfigHost', host:"https://foo.cdn.com"})
    expect(replaced).toBe('https://example.com/pd1/index.html')

    expect(fetch).toHaveBeenLastCalledWith(`https://foo.cdn.com/testConfigHost/environments.json`);
    

})

test('appendEl', async () => {

    window._imenvt_ = 'st1';

    const spy = vi.spyOn(document.body, 'appendChild');

    const project = 'tests/core-ui';
    const environments = {configuration: {
        environments: [
        {id:'pd1'}, 
        {id:'st1'}
        ]}}

    const dom = [
        {el: 'script', attrs: [
            ['src','https://storage.googleapis.com/tests/core-ui/{env}/index.html']
        ], target: 'body'}
    ];

    await window.__envfriend.appendEl(dom, {project, environments})

    const el = document.createElement('script');
    el.src = 'https://storage.googleapis.com/tests/core-ui/st1/index.html'
    expect(document.body.appendChild).toHaveBeenCalledWith(el);

    
    
    window._imenvt_ = 'production';

    (fetch as any).mockResolvedValue(createFetchResponse(mockConfig));


    const dom2 = [
        {el: 'script', attrs: [
            ['src','https://storage.googleapis.com/foobar/{env}/index.html']
        ], target: 'body'}
    ];

    const el1 = document.createElement('script');
    el1.src = 'https://storage.googleapis.com/foobar/pd1/index.html';
    await window.__envfriend.appendEl(dom2, {project: "foobar"})
    expect(document.body.appendChild).toHaveBeenCalledWith(el1);
    


})

test('override with absolute url', async () => {


    window._imenvt_ = 'pd1';

    const environments = {configuration: {
        environments: [
        {id:'pd1'}, 
        {id:'st1'}
        ]}}


    expect(await window.__envfriend.getEnvironmentUrl('{env}/index.html', 
    {project: 'fooproj1', environments})).toBe('pd1/index.html');

    expect(window.__envfriend.configCache.fooproj1.pd1.id).toBe('pd1')
    expect(window.__envfriend.configCache.fooproj1.st1.id).toBe('st1')

    window.__envfriend.overrideCurrentEnvironment('fooproj1', 'http://www.example.com');

    expect(await window.__envfriend.getEnvironmentUrl('{env}/index.html', 
    {project: 'fooproj1', environments})).toBe('http://www.example.com/index.html');

    expect(window.__envfriend.configCache.fooproj1['http://www.example.com'].id).toBe('http://www.example.com')

    window.__envfriend.overrideCurrentEnvironment('fooproj1');

    //sticky until we reload the page for convenience...
    expect(window.__envfriend.configCache.fooproj1['http://www.example.com'].id).toBe('http://www.example.com')

})

test('test non-configured environment override', async () => {
    window._imenvt_ = 'pd1';

    const environments = {configuration: {
        environments: [
        {id:'pd1'}, 
        {id:'st1'}
    ]}}

    expect(await window.__envfriend.getEnvironmentUrl('{env}/index.html', 
    {project: 'fooproj1', environments})).toBe('pd1/index.html');

    window.__envfriend.overrideCurrentEnvironment('fooproj1', 'st2!');

    expect(await window.__envfriend.getEnvironmentUrl('{env}/index.html', 
    {project: 'fooproj1', environments})).toBe('st2/index.html');

    expect(window.__envfriend.configCache.fooproj1['st2!'].id).toBe('st2!')
    expect(window.__envfriend.configCache.fooproj1['st2!'].bucketPath).toBe('st2')

})

/*TODO
- test failing fetch
- incorrect configuration json
- missing configuration json
- invalid response
*/