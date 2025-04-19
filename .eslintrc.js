module.exports = {
	root: true,
	extends: [
		'universe',
		'universe/shared/typescript-analysis',
		'plugin:react-hooks/recommended',
	],
	overrides: [
		{
			files: ['*.ts', '*.tsx', '*.d.ts'],
			parserOptions: {
				project: './tsconfig.json',
			},
		},
	],
	rules: {
		'react-native/no-raw-text': ['error', {
			skip: ['H1', 'H3', 'Muted'] // Add any custom text-rendering components here
		}],
		'@typescript-eslint/no-unused-vars': 'warn',
	},
	plugins: ['react-native'],
};
