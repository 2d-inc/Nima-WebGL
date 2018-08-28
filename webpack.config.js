const webpack = require("webpack");
const path = require("path");

const BUILD_DIR = path.resolve(__dirname, "build/");
const APP_DIR = path.resolve(__dirname, "source/");

const config =
{
	mode: "development",
	target: "web",
	devtool: "source-map",
	entry:
	{
		Nima: APP_DIR + "/Nima.js"
	},	
	output:
	{
		path: BUILD_DIR,
		filename: "Nima.min.js",
		library: "Nima",
		libraryTarget: "umd"
	},
	module :
	{
		rules:
		[
			{
				test : /\.js?/,
				use:
				{
					loader : "babel-loader"
				}
			}
		]
	}
};

module.exports = config;