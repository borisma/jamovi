
'use strict';

const $ = require('jquery');

const csvifyCells = function(cells) {
    if (cells.length === 0)
        return '';

    let rows = new Array(cells[0].length);

    for (let rowNo = 0; rowNo < cells[0].length; rowNo++) {
        let row = '';
        let sep = '';
        for (let colNo = 0; colNo < cells.length; colNo++) {
            let cell = cells[colNo][rowNo];
            if (cell === null)
                row += sep + '';
            else if (typeof cell === 'string')
                row += sep + '"' + cell.replace(/"/g, '""') + '"';
            else
                row += sep + cell;
            sep = ',';
        }
        rows[rowNo] = row;
    }

    return rows.join('\n');
};

const htmlifyCells = function(cells, options={}) {
    if (cells.length === 0)
        return '';

    let rows = new Array(cells[0].length);

    for (let rowNo = 0; rowNo < cells[0].length; rowNo++) {
        let row = '<tr><td>';
        let sep = '';
        for (let colNo = 0; colNo < cells.length; colNo++) {
            let cell = cells[colNo][rowNo];
            if (cell === null)
                row += sep + '';
            else if (typeof cell === 'string')
                row += sep + cell.replace('\u2212', '-');  // minus to dash
            else
                row += sep + cell;
            sep = '</td><td>';
        }
        row += '</td></tr>';
        rows[rowNo] = row;
    }

    let generator = '';
    if (options.generator)
        generator = '<meta name="generator" content="' + options.generator + '" />';

    return '<!DOCTYPE html>\n<html><head><meta charset="utf-8">' + generator + '</head><body><table>' + rows.join('\n') + '</table></body></html>';
};

const exportElem = function($el, format, options={images:'absolute'}) {
    if (format === 'text/plain') {
        return Promise.resolve(_textify($el[0]));
    }
    else {
        return _htmlify($el[0], options).then((content) => {

            let generator = '';
            if (options.generator)
                generator = '        <meta name="generator" content="' + options.generator + '" />';

            let html = `<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8" />
` + generator + `
        <title>Results</title>
        <style>

    body {
        font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol" ;
        color: #333333 ;
        cursor: default ;
        margin: 24px ;
        font-size: 12px ;
    }

    h1 {
        font-size: 160% ;
        color: #3E6DA9 ;
        margin-bottom: 12px ;
        white-space: nowrap ;
    }

    h2 {
        font-size: 130% ;
        margin-bottom: 12px ;
        color: #3E6DA9 ;
    }

    h3, h4, h5 {
        font-size: 110% ;
        margin-bottom: 12px ;
    }

    table {
        border-spacing: 0 ;
        page-break-inside: avoid;
    }

    table tr td, table tr th {
        page-break-inside: avoid;
        font-size: 12px ;
    }
        </style>
</head>
<body>`;


            html += content;
            html += '</body></html>';

            return html;
        });
    }
};

const _textify = function(el) {
    if (el.nodeType === Node.TEXT_NODE)
        return '\n' + el.data + '\n';

    let str = '';

    for (let child of $(el).contents())
        str += _textify(child);

    return str;
};

const _htmlify = function(el, options) {

    if (el.nodeType === Node.TEXT_NODE) {
        let data = el.data.replace('\u2212', '-');
        return Promise.resolve(data);
    }

    if (el.nodeType !== Node.ELEMENT_NODE)
        return Promise.resolve('');

    let tag = el.tagName.toLowerCase();
    let include = false;
    let includeChildren = true;
    let styles = [ ];
    let prepend = '';
    let append = '';

    return Promise.resolve().then(() => {

        switch (tag) {
        case 'div':
            if ($(el).css('display') === 'none') { // is display: none ;
                include = false;
                includeChildren = false;
            }
            else {
                return _htmlifyDiv(el, options);
            }
            break;
        case 'iframe':
            return _htmlifyIFrame(el, options);
        case 'table':
            include = true;
            prepend = '';
            append = '<p>&nbsp;</p>';
            break;
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'thead':
        case 'tbody':
        case 'tfoot':
        case 'tr':
        case 'pre':
            include = true;
            break;
        case 'td':
        case 'th':
            include = true;
            styles = [
                'text-align',
                'padding',
                'border-left',
                'border-right',
                'border-top',
                'border-bottom' ];
            break;
        }

        return Promise.resolve('');

    }).then(html => {

        html += prepend;

        if (include) {
            html += '<' + tag;
            for (let attrib of el.attributes) {
                if (attrib.name !== 'class' && attrib.specified)
                    html += ' ' + attrib.name + '="' + attrib.value + '"';
            }
            if (styles.length > 0) {
                html += ' style="';
                for (let style of styles)
                    html += style + ':' + $(el).css(style) + ';';
                html += '"';
            }
            html += '>';
        }

        let promises = [ ];
        if (includeChildren) {
            for (let child of $(el).contents())
                promises.push(_htmlify(child, options));
        }

        return Promise.all(promises).then(all => {

            return html + all.join('');

        }).then(html => {

            if (include)
                html += '</' + tag + '>';
            html += append;
            return html;
        });
    });
};

const _htmlifyIFrame = function(el, options) {
    let str = '';
    let promises = [ ];
    for (let child of $(el.contentWindow.document).find('body').contents())
        promises.push(_htmlify(child, options));
    return Promise.all(promises).then(all => all.join(''));
};

const _htmlifyDiv = function(el, options) {

    let str = '';
    let bgiu = $(el).css('background-image');

    if (bgiu === 'none')
        return Promise.resolve('');

    let width = $(el).css('width');
    let height = $(el).css('height');
    let bgi = /(?:\(['"]?)(.*?)(?:['"]?\))/.exec(bgiu)[1]; // remove surrounding uri(...)

    if (options.images === 'absolute') {
        return '<img src="' + bgi + '" style="width:' + width + ';height:' + height + ';">';
    }

    if (options.images === 'relative') {
        let dbgi = decodeURI(bgi);
        if (dbgi.startsWith(el.baseURI + 'res/')) {
            dbgi = dbgi.substring(el.baseURI.length + 4);
            bgi = encodeURI(dbgi);
        }
        else {
            console.log('Unable to resolve relative address');
            bgi = '';
        }
        return '<img src="' + bgi + '" style="width:' + width + ';height:' + height + ';" alt="">';
    }

    return new Promise((resolve, reject) => {

        let xhr = new XMLHttpRequest();  // jQuery doesn't support binary!
        xhr.open('GET', bgi);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function(e) {
            let mime = this.getResponseHeader('content-type');
            let data = new Uint8Array(this.response);
            let b64 = btoa(String.fromCharCode.apply(null, data));
            let dataURI = 'data:' + mime + ';base64,' + b64;
            resolve(dataURI);
        };
        xhr.onerror = function(e) {
            reject(e);
        };
        xhr.send();

        return str;
    }).then((dataURI) => {

        return '<img src="' + dataURI + '" style="width:' + width + ';height:' + height + ';">';
    });
};

module.exports = { exportElem, csvifyCells, htmlifyCells };
