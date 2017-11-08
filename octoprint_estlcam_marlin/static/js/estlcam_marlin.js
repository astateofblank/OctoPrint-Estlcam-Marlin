/*
 * View model for OctoPrint-Estlcam-Marlin
 *
 * Author: Josh Major
 * License: AGPLv3
 */
$(function() {
    function visualEstlcamGCode(gcode) {
        var state = false;

        // Search for Z direction changes, and insert extruder on/off (M101/M103) 
        const visual = gcode.replace(/^G0?[01] ([^Z\n]+)?Z(\-?[0-9]+\.?[0-9]*)(.*?)$/gm, (line, xy, z, f) => {
            z = parseFloat(z);

            if (z > 0 && state) {
                state = false;

                if (xy) {
                    return 'M103\nG1 Z' + z + f + '\nG1 ' + xy;
                }
                
                return 'M103\nG1 Z' + z + f;
            } else if (z <= 0 && !state) {
                state = true;

                if (xy) {
                    return 'G1 ' + xy + f + '\nG1 Z' + z + '\nM101';
                }
                
                return 'G1 Z' + z + f + '\nM101';
            } 
            
            return xy ? 'G1 ' + xy + f + '\nG1 Z' + z : 'G1 Z' + z + f;
        }).replace(/G00/g, 'G1').replace(/G01/g, 'G1');

        return visual;
    }

    function Estlcam_marlinViewModel(parameters) {
        var self = this;

        // assign the injected parameters, e.g.:
        self.loginStateViewModel = parameters[0];
        self.settingsViewModel = parameters[1];

        // TODO: Implement your plugin's view model here.
        self.interval = undefined;
        self.loadedFilepath = undefined;
        self.loadedFileDate = undefined;
        self.tabActive = false;

        self.fromCurrentData = function(data) {
            if (data.job.file.path) {
                self.loadFile(data.job.file.path, data.job.file.date);
            }
        }

        self.fromHistoryData = function(data) {
            if (data.job.file.path) {
                self.loadFile(data.job.file.path, data.job.file.date);
            }
        }

        self.onTabChange = function(current, previous) {
            self.tabActive = current == "#gcode";
        };

        self.loadFile = function(path, date) {
            if (self.tabActive && (self.loadedFilepath !== path || self.loadedFileDate !== date)) {
                self.loadedFilepath = path;
                self.loadedFileDate = date;

                if (this.interval) {
                    clearInterval(this.interval);
                }

                console.log(self.loadedFilepath, self.loadedFileDate);
                

                OctoPrint.files.download('local', path)
                .done(function(response, rstatus) {
                    if (rstatus === 'success') {
                        console.log(response.slice(0, 100));
                        // Search first thousand characters for Estlcam identifier
                        if (response.slice(0, 1000).indexOf('Estlcam version') !== -1) {
                            this.waitForGCodeViewer(response);
                        }
                        
                    }
                }.bind(this));
            }
        }

        self.waitForGCodeViewer = function(gcode) {
            var interval = this.interval = setInterval(function() {
                var modelInfo = GCODE.gCodeReader.getModelInfo();

                if (isNaN(modelInfo.modelSize.x)) {
                    var par = {
                        target: {
                            result: visualEstlcamGCode(gcode)
                        }
                    };

                    clearInterval(interval);

                    GCODE.renderer.clear();
                    GCODE.gCodeReader.loadFile(par);
                }
            }, 250);
        };        
    }



    // view model class, parameters for constructor, container to bind to
    OCTOPRINT_VIEWMODELS.push([
        Estlcam_marlinViewModel,

        // e.g. loginStateViewModel, settingsViewModel, ...
        [ /* "loginStateViewModel", "settingsViewModel" */ ],

        // e.g. #settings_plugin_estlcam_marlin, #tab_plugin_estlcam_marlin, ...
        [ /* ... */ ]
    ]);
});
