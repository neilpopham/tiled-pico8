//
//  PICO-8 cart support for Tiled
//
//  Copyright © 2020—2023 Sam Hocevar <sam@hocevar.net>
//
//  This program is free software. It comes without any warranty, to
//  the extent permitted by applicable law. You can redistribute it
//  and/or modify it under the terms of the Do What the Fuck You Want
//  to Public License, Version 2, as published by the WTFPL Task Force.
//  See http://www.wtfpl.net/ for more details.
//

const PALETTE =
[
    '#000000', // black
    '#1d2b53', // dark_blue
    '#7e2553', // dark_purple
    '#008751', // dark_green
    '#ab5236', // brown
    '#5f574f', // dark_gray
    '#c2c3c7', // light_gray
    '#fff1e8', // white
    '#ff004d', // red
    '#ffa300', // orange
    '#ffec27', // yellow
    '#00e436', // green
    '#29adff', // blue
    '#83769c', // indigo
    '#ff77a8', // pink
    '#ffccaa', // peach

    '#291814',
    '#111d35',
    '#422136',
    '#125359',
    '#742f29',
    '#49333b',
    '#a28879',
    '#f3ef7d',
    '#be1250',
    '#ff6c24',
    '#a8e72e',
    '#00b543',
    '#065ab5',
    '#754665',
    '#ff6e59',
    '#ff9d81',
];

const TILED_VERSION = tiled.version.split('.').map((e,i) => e*100**(2-i)).reduce((a,b) => a+b);
const HEADER = 'pico-8 cartridge';
const PROPNAME = 'Private Data';

const MAP_WIDTH = 128;
const MAP_HEIGHT = 64;

const FLAGS = 8;

function tohex(x, ndigits)
{
    return (x + (1 << (ndigits * 4))).toString(16).slice(-ndigits);
}

function fromhex(s)
{
    return Number('0x'+s);
}

function toRgb(hexColor)
{
    return [
        fromhex(hexColor.substring(1, 3)),
        fromhex(hexColor.substring(3, 5)),
        fromhex(hexColor.substring(5))
    ];
}

function getPaletteIndex(pixelColor)
{
    const rgb = toRgb(pixelColor);
    let best = 9999;
    let idx = -1;
    PALETTE.forEach((palColor, i) => {
        const pal = toRgb(palColor);
        const d = deltaRgb(rgb, pal);
        if (d < best) {
            best = d;
            idx = i;
        }
    });
    return idx;
}

/**
 * Compare color difference in RGB
 * https://gist.github.com/ryancat/9972419b2a78f329ce3aebb7f1a09152
 * @param {Array} rgb1 First RGB color in array
 * @param {Array} rgb2 Second RGB color in array
 */
function deltaRgb (rgb1, rgb2) {
  const [ r1, g1, b1 ] = rgb1,
        [ r2, g2, b2 ] = rgb2,
        drp2 = Math.pow(r1 - r2, 2),
        dgp2 = Math.pow(g1 - g2, 2),
        dbp2 = Math.pow(b1 - b2, 2),
        t = (r1 + r2) / 2

  return Math.sqrt(2 * drp2 + 4 * dgp2 + 3 * dbp2 + t * (drp2 - dbp2) / 256)
}

// Extract a hexadecimal section from a p8 cart data, e.g. ‘__gfx__’
function p8_extract(buf, header)
{
    return p8_split(buf, header)[1];
}

// Split a p8 cart in order to replace a hex section
function p8_split(buf, header)
{
    let gpos = buf.indexOf(header);
    if (gpos < 0)
    {
        return [buf, '', '']
    }

    let prefix = buf.slice(0, gpos)
    gpos = gpos + header.length;
    let gend = buf.indexOf('__', gpos);
    if (gend < 0)
        gend = buf.length;
    return [ prefix,
             buf.slice(gpos, gend).replace(/[^0-9a-fA-F]+/g, ''),
             buf.slice(gend, buf.length) ];
}

function pico8_read(filename)
{
    let f = new BinaryFile(filename);
    let cart = f.readAll().toString();
    f.close();

    if (cart.slice(0, HEADER.length) != HEADER)
        throw new TypeError('Not a PICO-8 cartridge!');

    // Create a map
    let tm = new TileMap('PICO-8 Map');
    tm.setSize(MAP_WIDTH, MAP_HEIGHT);
    tm.setTileSize(8, 8);
    tm.orientation = TileMap.Orthogonal;
    tm.backgroundColor = PALETTE[0];
    tm.setProperty(PROPNAME, Qt.btoa(cart));

    // Read gfx data into an image
    let gfx = p8_extract(cart, '__gfx__');
    let img = new Image(128, 128, Image.Format_Indexed8);
    img.setColorTable(PALETTE);
    img.fill(0);
    for (let i = 0; i < Math.min(128 * 128, gfx.length); ++i)
        img.setPixel(i % 128, Math.floor(i / 128), fromhex(gfx[i]));
    // Create a tileset from sprite image
    let t = new Tileset('PICO-8 Sprites');
    t.setTileSize(8, 8);
    t.objectAlignment = Tileset.TopLeft;
    t.loadFromImage(img);
    // Set Flag 0 to Flag 7 custom properties on each tile
    let properties = {};
    for (let i = 0; i<FLAGS; i++) {
        properties[`Flag ${i}`] = false;
    }
    t.tiles.forEach(ti => { ti.setProperties(properties); });
    tm.addTileset(t);

    // Read map data into a tile layer
    let map = p8_extract(cart, '__map__');
    let tl = new TileLayer('PICO-8 Map Layer');
    tl.width = MAP_WIDTH;
    tl.height = MAP_HEIGHT;
    let tle = tl.edit();
    function set_tile(x, y, s)
    {
        let id = fromhex(s);
        if (id > 0)
            tle.setTile(x, y, t.tile(id));
    }
    for (let i = 0; i < Math.min(MAP_HEIGHT * MAP_WIDTH, Math.floor(map.length / 2)); ++i)
        set_tile(i % MAP_WIDTH,
                 Math.floor(i / MAP_WIDTH),
                 map.substring(i * 2, i * 2 + 2));
    // The second part of the sprite data also contains map data
    let gfx2 = gfx.slice(128 * 64).replace(/(.)(.)/g, '$2$1');;
    for (let i = 0; i < Math.min(128 * 64, gfx2.length); i += 2)
        set_tile(Math.floor(i / 2) % MAP_WIDTH,
                 MAP_HEIGHT / 2 + Math.floor(i / 2 / MAP_WIDTH),
                 gfx2.substring(i, i + 2));
    tle.apply();
    tm.addLayer(tl);

    // Read __tif__ data into an object layer
    let og = new ObjectGroup('PICO-8 Object Layer');
    if (cart.indexOf('__tif__') > 0) {
        const _tif = cart.match(/__tif__ ?= ?["'](.+)["']/)
        if (_tif) {
            const _tiftiles = _tif[1].split(',')
            _tiftiles.forEach(tile => {
                const d = tile.split(':');
                const mo = new MapObject()
                mo.tile = t.tile(Number(d[2]));
                mo.pos = Qt.point(Number(d[0]) * 8, Number(d[1]) * 8);
                mo.size = Qt.size(8, 8);
                for (i = 0; i < FLAGS; i++) {
                    mo.setProperty(`Flag ${i}`, !!(d[3] & (1<<i)));
                }
                og.addObject(mo);
            });
        }
    }
    tm.addLayer(og);

    return tm;
}

function pico8_write(tm, filename)
{
    let cart = Qt.atob(tm.property(PROPNAME));
    if (cart.slice(0, HEADER.length) != HEADER)
        throw new TypeError('This map was not loaded from a PICO-8 cart');

    let layer = tm.layerAt(0);
    let eol = cart.indexOf('\r\n') >= 0 ? '\r\n' : '\n';

    // Convert map data to hex
    let data = '';
    for (let i = 0; i < MAP_WIDTH * MAP_HEIGHT; ++i)
    {
        let t = layer.cellAt(i % MAP_WIDTH, Math.floor(i / MAP_WIDTH)).tileId;
        data += tohex(Math.max(t, 0), 2);
    }

    // Retrieve gfx data from the original cart.
    let [ prefix, gfx, suffix ] = p8_split(cart, '__gfx__');

    // Load the tileset used
    let tileset = tm.tilesets[0];
    let gfxOut = '';

    // If there's an image set, the user has loaded an external tileset which we
    // now need to store in the cart (on next load, it'll be pulled back out of
    // the cart)
    if (tileset.image)
    {
        // The first 64 lines are generated from the tileset image
        let tilesetImage = new Image(tileset.image);

        // Only take the first 128x64 pixels worth
        for (let i = 0; i < 128 * 64; ++i)
        {
            // But allow the image itself to be any shape
            let p = tilesetImage.pixelColor(i % tilesetImage.width, Math.floor(i / tilesetImage.width));
            // Assume the image is already formatted in the PICO-8 palette
            let c = PALETTE.findIndex((color) => color === p.toString().toLowerCase())
            // If not, try to get best match
            if (c == -1) {
                c = getPaletteIndex(p.toString()) % 16;
            }
            // Write it out as color 0 if there's not an exact match found
            gfxOut += tohex(Math.max(c, 0), 1);
        }
    }
    else
    {
        // The first 64 lines are preserved from the .p8 file
        gfxOut = gfx.slice(0, 128 * 64).padEnd(128 * 64, '0');
    }

    // The next 64 lines are taken from the map section because they are from the
    // shared area.
    gfxOut = gfxOut + data.slice(128 * 64, 128 * 128).replace(/(.)(.)/g, '$2$1');

    // Remove empty lines and store
    gfxOut = gfxOut.slice(0, 128 * 128).replace(/(0{128})+$/, '');
    cart = [prefix].concat('__gfx__').concat(gfxOut.match(/.{128}/g)).concat(suffix).join(eol);

    // Store map data. Contrary to gfx data, nothing is preserved.
    [ prefix, map, suffix ] = p8_split(cart, '__map__');
    map = data.slice(0, 256 * 32).replace(/(0{256})+$/, '');
    cart = [prefix].concat('__map__').concat(map.match(/.{256}/g)).concat(suffix).join(eol);

    // Store __tif__ data
    layer = tm.layerAt(1);
    if (layer.isObjectLayer) {
        const tiles=[];
        layer.objects.forEach(o => {
            if (o.tile) {
                const custom = o.properties();
                let bits = 0;
                for (const property in custom) {
                    const flag = property.match(/Flag (\d)/);
                    if (flag != null && custom[property]) {
                        bits |= (1 << flag[1]);
                    }
                }
                const pos = tm.pixelToTile(o.pos);
                tiles.push([pos.x, pos.y, o.tile.id, bits].join(':'));
            }
        });
        const meta = tiles.join(',');
        if (cart.indexOf('__tif__') > 0) {
            const _tif = cart.match(/__tif__ ?= ?["'](.*)["']/)
            cart = cart.replace(_tif[1], meta);
        } else if (meta.length) {
            const lua= `__lua__${eol}${eol}local __tif__="${meta}"`;
            if (cart.indexOf('__lua__') > 0) {
                cart = cart.replace('__lua__', lua);
            } else {
                const spacer = cart.indexOf(eol+eol);
                cart = cart.substring(0, spacer)
                    .concat(eol)
                    .concat(lua)
                    .concat(cart.substring(spacer));
            }
        }
    }

    // Save the file
    let f = new BinaryFile(filename, BinaryFile.WriteOnly);
    f.write(cart);
    f.commit();
}

if (TILED_VERSION >= 10500)
{
    const pico8_format =
    {
        name: 'PICO-8 Cart',
        extension: 'p8',
        read: pico8_read,
        write: pico8_write,
    };

    tiled.registerMapFormat('PICO-8', pico8_format);
}
else
{
    console.warn(`Tiled version ${tiled.version} is too old for the PICO-8 plugin (1.5.0 required)`);
}
