﻿module.exports = function (grunt) {
    var localConfig = {
        typeScriptDeclarations:[
            "**/*.d.ts",
            "!references.d.ts",
            "!demo/**/*.*",
            "!demo-ng/**/*.*",
            "!node_modules/**/*.*",
            "!bin/**/*.*"
        ],
        outDir: "bin/dist/"
    }

    grunt.initConfig({
        clean:{
            build:{
                src:[localConfig.outDir]
            }
        },
        copy: {
            declarations: {
                src: localConfig.typeScriptDeclarations,
                dest: localConfig.outDir
            },
            platforms: {
                files: [{ expand: true, src: ["platforms/**"], dest: localConfig.outDir }]
            },
            packageConfig: {
                src: "package.json",
                dest: localConfig.outDir,
                options: {
                    process: function (content, srcPath) {
                        var contentAsObject = JSON.parse(content);
                        contentAsObject.devDependencies = undefined;
                        contentAsObject.scripts = undefined;
                        return JSON.stringify(contentAsObject, null, "\t");
                    }
                }
            },
            readme: {
                src: "README.md",
                dest: localConfig.outDir,
                options: {
                    process: function (content, srcPath) {
                        return content.substring(content.indexOf("\n") + 1)
                    }
                }
            }
        },
        exec: {
            tsPatch: {
                cmd: "npm i && ./node_modules/.bin/ts-patch install"
            },
            tsCompile: {
                cmd: "./node_modules/.bin/tsc --project tsconfig.json --outDir " + localConfig.outDir
            },
            ngCompile: {
                cmd: "node ./node_modules/.bin/ngc --project tsconfig.aot.json --outDir " + localConfig.outDir
            },
            tslint: {
                cmd: "./node_modules/.bin/tslint --project tsconfig.json --type-check"
            },
            checkRequiredReadmeSection: {
                cwd: "bin/dist",
                cmd: function (section) {
                    return "cat README.md | grep -q \"# " + section + "\"";
                }
            },
            checkRequiredPackageJsonSection: {
                cwd: "bin/dist",
                cmd: function (section) {
                    return "cat package.json | grep -q \"\\\"" + section + "\\\"\"";
                }
            },
            "ci-build-demo": {
                cmd: function (platform, demoSuffix) {
                    return "cd demo" + (demoSuffix != "" ? "-" + demoSuffix : "") + " && npm install && tns build " + platform;
                }
            },
            "ci-webpack-demo": {
                cmd: function (platform, demoSuffix) {
                    return "cd demo" + (demoSuffix != "" ? "-" + demoSuffix : "") + " && npm install && tns build " + platform
                        + " --bundle --env.uglify --env.snapshot"
                        + (demoSuffix === "ng" ? " --env.aot" : "");
                }
            },
            npm_publish: {
                cmd: "npm publish",
                cwd: localConfig.outDir
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-exec");

    grunt.registerTask("compile", [
        "clean:build",
        "exec:tsCompile",
        "exec:ngCompile",
        "exec:tsPatch",
        "copy"
    ]);

    grunt.registerTask("build", [
        "exec:tslint",
        "compile",
        "copy"
    ]);

    grunt.registerTask("ci", "Performs CI builds for the demo projects", function (action, platform) {
        if (!platform || platform === "") {
            grunt.warn("You must specify a platform (ios or android)!");
        }
        if (!action || action === "") {
            grunt.warn("You must specify an action (build or webpack)!");
        }

        var baseTask = "exec:ci-" + action.toLowerCase() + "-demo:" + platform.toLowerCase();
        grunt.task.run(
            baseTask + ":",
            baseTask + ":ng"
        );
    });

    grunt.registerTask("lint", [
        "exec:checkRequiredReadmeSection:Installation",
        "exec:checkRequiredReadmeSection:Configuration",
        "exec:checkRequiredReadmeSection:API",
        "exec:checkRequiredReadmeSection:Usage",
        "exec:checkRequiredPackageJsonSection:license",
        "exec:checkRequiredPackageJsonSection:nativescript",
        "exec:tslint",
    ]);

    grunt.registerTask("publish", [
        "build",
        "lint",
        "exec:npm_publish"
    ]);
};
