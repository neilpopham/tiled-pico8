-- Converts __tif__ into a table for use with the tget, tgets and tset functions
local _tif,_tiftiles={},split(__tif__)
for tile in all(_tiftiles) do
    local x,y,s,f=unpack(split(tile,":"))
    if not _tif[x] then _tif[x]={} end
    _tif[x][y]={s,f}
end

-- Gets the value of a flag of a tile
function tget(x,y,f)
    return f==nil and _tif[x][y][2] or _tif[x][y][2]&1<<f>0
end

-- Gets the sprite for a tile
function tgets(x,y)
    return _tif[x][y][1]
end

-- Sets the value of a flag of a tile
function tset(x,y,f,v)
    local _f=_tif[x][y][2]
    _f=v==nil and f or v and _f|1<<f or _f&~(1<<f)
    _tif[x][y][2]=_f
end