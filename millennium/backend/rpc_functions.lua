local http = require("http")
local logger = require("logger")
-- The docs call this module "json", the bundled type stubs call it "cjson".
local has_json, json = pcall(require, "json")
if not has_json then
    json = require("cjson")
end

-- The store page can't call these other sites itself, so it asks us.
-- Only these read-only requests are allowed. Some URLs carry an access token: never log them.
local ALLOWED = {
    "https://api.steampowered.com/IFamilyGroupsService/GetFamilyGroupForUser/v1/?",
    "https://api.steampowered.com/IFamilyGroupsService/GetSharedLibraryApps/v1/?",
    "https://api.steampowered.com/IWishlistService/GetWishlist/v1/?",
    "https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?",
    "https://catalog.gamepass.com/sigls/v2?",
    "https://displaycatalog.mp.microsoft.com/v7.0/products?",
    "https://www.playstation.com/bin/imagic/gameslist?",
}

local function is_allowed(url)
    for _, prefix in ipairs(ALLOWED) do
        if url:sub(1, #prefix) == prefix then
            return true
        end
    end
    return false
end

local function starts_with(text, prefix)
    return text:sub(1, #prefix) == prefix
end

-- Catalog replies are large (megabytes in total), which is too much to pass to the page.
-- These functions keep only the titles the page reads.
local function game_pass_titles(data)
    local products = {}
    for _, product in ipairs(data.Products or {}) do
        local localized = type(product.LocalizedProperties) == "table" and product.LocalizedProperties[1]
        if localized and type(localized.ProductTitle) == "string" then
            products[#products + 1] = { LocalizedProperties = { { ProductTitle = localized.ProductTitle } } }
        end
    end
    -- An empty Lua table would be encoded as {} instead of a list.
    if #products == 0 then
        return '{"Products":[]}'
    end
    return json.encode({ Products = products })
end

local function play_station_titles(data)
    local games = {}
    for _, group in ipairs(data) do
        for _, game in ipairs(group.games or {}) do
            local name = type(game.name) == "string" and game.name or nil
            local name_en = type(game.nameEn) == "string" and game.nameEn or nil
            if name or name_en then
                games[#games + 1] = { name = name, nameEn = name_en }
            end
        end
    end
    if #games == 0 then
        return "[]"
    end
    return json.encode({ { games = games } })
end

local function shrink(url, body)
    local reduce
    if starts_with(url, "https://displaycatalog.mp.microsoft.com/") then
        reduce = game_pass_titles
    elseif starts_with(url, "https://www.playstation.com/") then
        reduce = play_station_titles
    else
        return body
    end
    local ok, smaller = pcall(function()
        return reduce(json.decode(body))
    end)
    if ok then
        return smaller
    end
    logger:warn("Couldn't shorten a catalog reply: " .. tostring(smaller))
    return body
end

---@ffi
---@param url string
---@return string
function steam_get(url)
    if not is_allowed(url) then
        return json.encode({ status = 403, body = "" })
    end
    local response = http.get(url, {
        timeout = 30,
        follow_redirects = false,
        user_agent = "Mozilla/5.0",
    })
    if not response then
        return json.encode({ status = 0, body = "" })
    end
    local body = response.body
    if response.status == 200 then
        body = shrink(url, body)
    end
    return json.encode({ status = response.status, body = body })
end
