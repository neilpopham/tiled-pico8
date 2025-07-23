# PICO-8 import/export plugin for Tiled

## Seamlessly edit your PICO-8 carts in Tiled!

This plugin lets you open `.p8` files in Tiled and edit them without worrying about
breaking the code section or manually merging changes in the `.p8` file.

# Installation

 - install Tiled:
   - download the [installer](https://www.mapeditor.org/)
   - run the installer
 - open the Tiled extension directory, either:
   - run Tiled
   - go to Edit → Preferences → Plugins
   - click on “Open…” in the Extensions section
 - (alternatively, you can open `%LOCALAPPDATA%\Tiled\extensions` on Windows)
 - download [`pico8.js`](https://raw.githubusercontent.com/samhocevar/tiled-pico8/master/pico8.js) and save it to that directory

*Warning*: This plugin requires [Tiled](https://www.mapeditor.org/) version 1.5.0 or later.

If for some reason you want to use the old, deprecated Python version of this plugin, you
may check the old [python branch](https://github.com/samhocevar/tiled-pico8/tree/python).

# Example

![Screenshot](/tiled-pico8.png)

# What The Fork?

This fork adds an additional Object Layer to the map, which allows you to add tiles, and set up to 8 flags on each one.

These flags can be used in the same way that PICO-8's [`fget()`](https://pico-8.fandom.com/wiki/Fget) is used for sprites, but at an individual tile level.

The file `helpers.lua` contains `tget()`, `tset()`, and `tgets()` functions to utlise the data, although you may choose to simply interact with the `__tif__` variable directly.

![Screenshot](/tiled-pico8-objects.png)

## Intended Usage

You can use the Tile Layer to specify your map, and the Object Layer to add sprites that your code will later convert to objects.

Setting flags on the tile you place then allows you to set metadata for that object, for example:

* The direction that an entity is facing
* A unique index on a button tile, that is reflected on its sibling door tile
* The starting health or weapon that an entity has

Using these flags allows you to forget about having to maintain your own table to set object metadata, and instead use a familiar system to help you initialise your objects on `_init()`. If you move a tile on your Object Layer in Tiled the metadata is moved with it, and you do not need to worry about updating your table manually.

**NB:** When placing tiles on the Object Layer you should ensure that you have *Snap to Grid* enabled, which can be found under the *View* > *Snapping* sub-menu.

## LUA Code

The core variable is a string called `__tif__` which stores four values for each tile:

1. The tile's X co-ordinate
2. The tile's Y co-ordinate
3. The sprite index
4. The flags, as an integer from 0-255

The functions provided in `helpers.lua` mimic PICO-8's [`fget()`](https://pico-8.fandom.com/wiki/Fget) and [`fset()`](https://pico-8.fandom.com/wiki/Fset). The additional `tgets(x,y)` returns the sprite index at the tile co-ordinates `x` and `y`.

This is my first time using this fork, and I am simply using `__tif__` like so:

    function make_entity_1(x,y,flags)
        ...
    end

    makers={
        [127]=make_entity_1,
        [126]=make_entity_2,
        [125]=make_entity_3,
        ...
    }

    for tile in all(split(__tif__)) do
        local x,y,s,f=unpack(split(tile,":"))
        makers[s](x,y,f)
    end

The code above iterates through each tile in the Object Layer, and calls a maker function for the given sprite index, passing the tile co-ordinates and flag value.

If you are unfamliar with [bitwise operations](https://pico-8.fandom.com/wiki/Bitwise_Operations), then you may opt to use `tget()` to interrogate the tile's flags in your maker function.