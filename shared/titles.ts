/**
 * Reduces a store title to a form that can be compared across stores.
 * Deliberately conservative: words such as "Remastered", "Deluxe" or a release year
 * are kept, so a missed match is more likely than removing the wrong game.
 */
export function normalizeTitle(title: string): string {
  return title
    .replace(/[™®©]/g, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // accents
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(
      /[([](pc|windows|windows 10|xbox one|xbox series x\|s|game preview|ps4|ps5)[)\]]/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .replace(
      /\b(ps4 and ps5|ps5 and ps4|for windows( 10)?|windows( 10)? edition|pc edition|xbox one edition|xbox series x\|s( edition)?|standard edition)\b/g,
      " ",
    )
    .replace(/[\s:–—-]+(ps4|ps5)\s*$/, "")
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
