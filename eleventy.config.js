// Configuration Eleventy : assemble src/index.njk avec les contenus de src/_data
// (ces fichiers sont modifiés depuis l'interface d'administration /admin).
export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("asset");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy({ "asset/img/favicon.ico": "favicon.ico" });

  // 3 → « 03 »
  eleventyConfig.addFilter("deuxChiffres", (n) => String(n).padStart(2, "0"));

  // Les boutons de filtre viennent des catégories écrites sur les compétences
  eleventyConfig.addFilter("categories", (competences = []) => [
    ...new Set(competences.map((c) => c.categorie).filter(Boolean)),
  ]);

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
  };
}
