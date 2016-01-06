module.exports = function(grunt) {
/*
 * grunt bump-only:minor
 - add GIT
 */
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		validation: {
			options: {
				relaxerror: ['The Content-Type was “text/html”. Using the HTML parser.',
							'Using the schema for HTML with SVG 1.1, MathML 3.0, RDFa 1.1, and ITS 2.0 support.'],
			},
			src: ['*.html'],
		},
		jshint: {
			src: ['./js/common.js', './js/states.json']	
		},
		copy: {
			raphael: {
				cwd: './us-map-1.0.1/lib/',
				src: ['raphael.min.js'],
				dest: '<%= pkg.build %>-<%= pkg.version %>/us-map-1.0.1/lib/',
				expand: true,
			},
			usmap: {
				cwd: './us-map-1.0.1',
				src: ['jquery.usmap.js'],
				dest: '<%= pkg.build %>-<%= pkg.version %>/us-map-1.0.1',
				expand: true,
			},
			js: {
				cwd: './js',
				src: ['chart.min.js', 'jquery-1.11.3.min.js'],
				dest: '<%= pkg.build %>-<%= pkg.version %>/js',
				expand: true,
			},
			jqueryui: {
				cwd: './jquery-ui-1.11.4.redmond',
				src: ['jquery-ui.min.js', 'jquery-ui.min.css'],
				dest: '<%= pkg.build %>-<%= pkg.version %>/jquery-ui-1.11.4.redmond',
				expand: true,
			},
			css: {
				cwd: './css',
				src: ['*.css'],
				dest: '<%= pkg.build %>-<%= pkg.version %>/css',
				expand: true,
			},
			images: {
				cwd: './images',
				src: ['*.png','*.jpg'],
				dest: '<%= pkg.build %>-<%= pkg.version %>/images',
				expand: true,
			},
			helpfiles: {
				cwd: './help',
				src: ['*.*'],
				dest: '<%= pkg.build %>-<%= pkg.version %>/help',
				expand: true,
			},
		},
		uglify: {
			my_target: {
				options: {
					banner: '/*\n * Application: <%= pkg.name %> \n * Author: <%= pkg.author %>\n * Date: <%= grunt.template.today("mm-dd-yyyy") %> \n */\n'
				},
				files: {
					'<%= pkg.build %>-<%= pkg.version %>/js/common.min.js' : ['./js/common.js', './js/states.json'],
				}
        	},
		},
		processhtml: {
			files: {
				cwd: './',
				src: ['*.html'], //<%= pkg.build %>-<%= pkg.version %>/index.html': ['index.html'],
				dest: '<%= pkg.build %>-<%= pkg.version %>',
				expand: true,
			}
		},
	});

	grunt.loadNpmTasks('grunt-contrib-copy');
	//grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-processhtml');
	grunt.loadNpmTasks('grunt-bump');
	grunt.loadNpmTasks('grunt-w3c-html-validation');
	grunt.loadNpmTasks('grunt-contrib-jshint');

	grunt.registerTask('default', ['validation', 'jshint', 'copy','uglify', 'processhtml']);
	grunt.registerTask('build', ['validation', 'jshint', 'copy','uglify', 'processhtml']);
};