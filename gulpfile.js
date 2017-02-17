var gulp = require('gulp');
var fs = require('fs');
var uglify = require('uglify-js');

gulp.task('default', function(cb)
{
	var files = [
		"source/Dispatcher.js",
		"source/Graphics.js",
		"source/Actor.js",
		"source/ActorComponent.js",
		"source/ActorEvent.js",
		"source/ActorNode.js",
		"source/ActorBone.js",
		"source/ActorImage.js",
		"source/ActorRootBone.js",
		"source/ActorIKTarget.js",
		"source/Animation.js",
		"source/BezierAnimationCurve.js",
		"source/BinaryReader.js",
		"source/ActorLoader.js"
	];
	var lib = uglify.minify(files, {
									compress: {
										screw_ie8: true,
										sequences: true,
										//properties: true,
										dead_code: true,
										drop_debugger: true,
										comparisons: true,
										conditionals: true,
										evaluate: true,
										booleans: true,
										loops: true,
										unused: true,
										hoist_funs: true,
										if_return: true,
										join_vars: true,
										cascade: true,
										//negate_iife: true,
										drop_console: true
									},
									outSourceMap: './build/Nima.min.js.map'
								});


	fs.writeFileSync('./build/Nima.min.js', lib.code);
	cb();
});