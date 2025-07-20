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

The plugin adds `tget()`, `tgets()`, and `tset()` functions to the LUA code to help, although you may choose to simply interact with the `__tif__` variable directly.

## Example Usage

You can use the Tile Layer to specify your map, and the Object Layer to add sprites that your code will later convert to objects.

Setting flags on the tile you place then allows you to set metadata for that object, for example:

* The direction that the entity is facing
* A unique index on a button tile, that is reflected on its sibling door tile
* The starting health or weapon that an enemy has

This negates the need for you to use a table to store this information for each entity^, and also means that if you move the entity on the map the metadata is moved with it.

^ _This information is still stored in a table. But this negates the need for you to maintain that table._
