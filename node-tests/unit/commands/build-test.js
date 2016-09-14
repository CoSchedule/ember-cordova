'use strict';

var td              = require('testdouble');

var ui              = require('../../../lib/utils/ui');
var expect          = require('../../helpers/expect');
var Promise         = require('ember-cli/lib/ext/promise');

var BuildCmd        = require('../../../lib/commands/build');
var BuildTask       = require('../../../lib/tasks/ember-build');
var CdvBuildTask    = require('../../../lib/tasks/cordova-build');
var HookTask        = require('../../../lib/tasks/run-hook');
var PlatformTask    = require('../../../lib/tasks/validate/platform');

var mockProject   = require('../../fixtures/ember-cordova-mock/project');
var mockAnalytics = require('../../fixtures/ember-cordova-mock/analytics');
var parsePlatformOpts = require('../../../lib/utils/parse-platform-opts');

describe('Build Command', function() {
  var build;

  beforeEach(function() {
    var project = mockProject.project;
    project.config = function() {
      return {
        locationType: 'hash'
      };
    }

    build = new BuildCmd({
      project: project,
      ui: mockProject.ui
    });
    build.analytics = mockAnalytics;
  });

  afterEach(function() {
    td.reset();
  });

  context('when locationType is hash', function() {
    var tasks;
    var cordovaOptions;

    beforeEach(function() {
      mockTasks();
    });

    function mockTasks() {
      tasks = [];

      td.replace(PlatformTask.prototype, 'run', function() {
        tasks.push('check-platform');
        return Promise.resolve();
      });

      td.replace(HookTask.prototype, 'run', function(hookName) {
        tasks.push('hook ' + hookName);
        return Promise.resolve();
      });

      td.replace(BuildTask.prototype, 'run', function() {
        return Promise.resolve();
      });

      td.replace(CdvBuildTask.prototype, 'run', function(_cordovaOptions) {
        cordovaOptions = _cordovaOptions;

        tasks.push('cordova-build');
        return Promise.resolve();
      });
    }

    it('exits cleanly', function() {
      return expect(function() {
        build.run({});
      }).not.to.throw(Error);
    });

    it('runs tasks in the correct order', function() {
      return build.run({})
        .then(function() {
          //h-t ember-electron for the pattern
          expect(tasks).to.deep.equal([
            'check-platform',
            'hook beforeBuild',
            'cordova-build',
            'hook afterBuild'
          ]);
        });
    });

    context('when passedPlatform is ios', function() {
      it('platform eq ios', function() {
        var passedPlatform = 'ios';

        return build.run({
          platform: passedPlatform
        }).then(function() {
          expect(cordovaOptions.platform).to.equal(passedPlatform);
        });
      });
    });
    context('when passedPlatform is android', function() {
      it('platform eq android', function() {
        var passedPlatform = 'android';

        return build.run({
          platform: passedPlatform
        }).then(function() {
          expect(cordovaOptions.platform).to.equal(passedPlatform);
        });
      });
    });

    describe('isRelease', function() {
      context('when release is false', function() {
        it('isRelease eq false', function() {
          var passedPlatform = 'ios';
          var passedRelease = false;

          return build.run({
            platform: passedPlatform,
            isRelease: passedRelease,
          }).then(function() {
            expect(cordovaOptions.isRelease).to.equal(passedRelease);
          });
        });
      });
      context('when release is true', function() {
        it('isRelease eq true', function() {
          var passedPlatform = 'ios';
          var passedRelease = true;

          return build.run({
            platform: passedPlatform,
            isRelease: passedRelease,
          }).then(function() {
            expect(cordovaOptions.isRelease).to.equal(passedRelease);
          });
        });
      });
    });

    describe('isEmulator', function() {
      context('when device is false', function() {
        it('isEmulator eq true', function() {
          var passedPlatform = 'ios';
          var passedDevice = false;

          return build.run({
            platform: passedPlatform,
            isEmulator: passedDevice,
          }).then(function() {
            expect(cordovaOptions.isEmulator).to.equal(passedDevice);
          });
        });
      });
      context('when device is true', function() {
        it('isEmulator eq false', function() {
          var passedPlatform = 'ios';
          var passedDevice = true;

          return build.run({
            platform: passedPlatform,
            isEmulator: passedDevice,
          }).then(function() {
            expect(cordovaOptions.isEmulator).to.equal(passedDevice);
          });
        });
      });
    });

    describe('buildConfig', function() {
      context('when not passed', function() {
        it('does not append buildConfig to options', function() {
          var passedPlatform = 'ios';
          var passedBuildConfig = undefined;

          return build.run({
            platform: passedPlatform,
          }).then(function() {
            expect(cordovaOptions.buildConfig).to.equal(passedBuildConfig);
          });
        });
      });
      context('when buildConfig is passed', function() {
        it('appends buildConfig options to options', function() {
          var passedPlatform = 'ios';
          var passedBuildConfig = '/foo';

          return build.run({
            platform: passedPlatform,
            buildConfig: passedBuildConfig,
          }).then(function() {
            expect(cordovaOptions.buildConfig).to.equal(passedBuildConfig);
          });
        });
      });
    });

    describe('platformOpts', () => {
      context('when platform is ios', function() {
        it('passes ios options to CdvBuildTask', function()  {
          var passedPlatform = 'ios';
          var platformOpts = parsePlatformOpts(
            cordovaOptions.platform,
            cordovaOptions
          );

          return build.run({
            platform: passedPlatform,
            platformOpts: platformOpts
          }).then(function() {
            expect('codeSignIdentity' in cordovaOptions.platformOpts)
            .to.equal('codeSignIdentity' in platformOpts);
          });
        });

        it('filters out android options', function() {
          var passedPlatform = 'ios';
          var platformOpts = parsePlatformOpts(
            cordovaOptions.platform,
            cordovaOptions
          );

          return build.run({
            platform: passedPlatform,
            platformOpts: platformOpts
          }).then(function() {
            expect('alias' in cordovaOptions.platformOpts)
            .to.equal('alias' in platformOpts);
          });
        });
      });

      context('when platform is android', function() {
        it('passes android options to CdvBuildTask', function() {
          var passedPlatform = 'android';
          var platformOpts = parsePlatformOpts(
            cordovaOptions.platform,
            cordovaOptions
          );

          return build.run({
            platform: passedPlatform,
            platformOpts: platformOpts
          }).then(function() {
            expect('alias' in cordovaOptions.platformOpts)
            .to.equal('alias' in platformOpts);
          });
        });

        it('filters out ios options', function() {
          var passedPlatform = 'android';
          var platformOpts = parsePlatformOpts(
            cordovaOptions.platform,
            cordovaOptions
          );

          return build.run({
            platform: passedPlatform,
            platformOpts: platformOpts
          }).then(function() {
            expect('codeSignIdentity' in cordovaOptions.platformOpts)
            .to.equal('codeSignIdentity' in platformOpts);
          });
        });
      });
    });
  });

  context('when locationType is not hash', function() {
    beforeEach(function() {
      build.project.config = function() {
        return {
          locationType: 'auto'
        };
      };

      td.replace(ui, 'writeLine',  function() {
        throw new Error('Exit Called');
      });

    });

    it('throws', function() {
      return expect(function() {
        build.run({});
      }).to.throw(Error);
    });
  });
});
