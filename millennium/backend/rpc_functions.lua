local http = require("http")
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
    return json.encode({ status = response.status, body = response.body })
end
