import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/generated/**",
      "docs/api-reference/**",
      "kubb.config.ts",
      "tsup.config.ts",
    ],
  },
  js.configs.recommended,
  security.configs.recommended,
  // Type-aware linting for the TypeScript sources only.
  {
    files: ["**/*.ts"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Plain JS/MJS (scripts, config): node globals, no type information.
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: globals.node,
      sourceType: "module",
    },
  },
  // Tests and scripts touch the filesystem and use loose typing intentionally.
  {
    files: ["**/*.test.ts", "**/test/**", "scripts/**"],
    rules: {
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-object-injection": "off",
      "security/detect-child-process": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
    },
  },
);
