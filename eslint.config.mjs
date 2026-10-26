import { defineConfig, globalIgnores } from "eslint/config";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
export default defineConfig([
  { files: ["**/*.{ts,tsx}"] , languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true }, sourceType: "module" } }, plugins: { "@typescript-eslint": tsPlugin }, rules: { ...tsPlugin.configs.recommended.rules, "@typescript-eslint/no-explicit-any": "off", "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }] } },
  { files: ["**/*.{js,mjs}"] },
  globalIgnores([".next/**", "node_modules/**", "generated/**", "next-env.d.ts"])
]);
