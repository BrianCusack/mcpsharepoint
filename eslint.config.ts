import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylistic,
  {
    files: ["src/**/*.ts"],
    ignores: ['node_modules', 'dist', 'build'],
  }
);