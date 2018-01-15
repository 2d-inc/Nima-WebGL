module.exports = 
{
	"parser": "babel-eslint",
	env:
	{
		browser: true,
		commonjs: true,
		es6: true,
		node: true,
	},
	extends: "eslint:recommended",
	parserOptions:
	{
		ecmaVersion: 6,
		sourceType: "module"
	},
	rules:
	{
		"comma-dangle": ["error", "never"],
		"linebreak-style": ["error", "unix"],
		quotes: ["error", "double"],
		semi: ["error", "always"],
		"no-unused-vars": ["warn"],
		"no-console": 0,
		"brace-style": ["error", "allman", { "allowSingleLine": true }],
		"no-inner-declarations": "off"
	}
};