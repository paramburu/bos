(function(jQuery, document, window) {
    'use strict';

    var simulationRate = 1,
        watchRun = -1,
        simRun = -1,
        finalSteelTemperature,

        secondsLabel = $('.elapsed-time .seconds')[0],
        minutesLabel = $('.elapsed-time .minutes')[0],
        hoursLabel = $('.elapsed-time .hours')[0],

        $stirringGasControl = $('#stirring_gas_control'),
        $simulationRateControl = $('#simulation_rate_control'),

        changeSimulationRate = function(val) {
            if (simRun != -1) {
                bofControl.simulationRate = +val;
                clearInterval(watchRun);
                watchRun = setInterval(watchRunning, 1000 / bofControl.simulationRate);
            }
        },

        watchRunning = function() {
            var seconds = parseInt(secondsLabel.innerHTML);

            seconds++;
            if (seconds <= 9) {
                seconds = String("0" + seconds);
            } else if (seconds == 60) {
                seconds = "00";
                increaseMinutes();
            } else {
                seconds = String(seconds);
            }
            secondsLabel.innerHTML = seconds;
        },

        increaseMinutes = function() {
            var minutes = parseInt(minutesLabel.innerHTML);
            minutes++;

            if (minutes <= 9) {
                minutes = String("0" + minutes);
            } else if (minutes == 60) {
                minutes = "00";
                increaseHours();
            } else {
                minutes = String(minutes);
            }
            minutesLabel.innerHTML = minutes;
        },

        increaseHours = function() {
            var hours = parseInt(hoursLabel.innerHTML);

            hours++;
            if (hours <= 9) {
                hours = String("0" + hours);
            } else {
                hours = String(hours);
            }
            hoursLabel.innerHTML = hours;
        },

        getSecondsTotal = function() {
            var seconds = parseInt(secondsLabel.innerHTML);

            seconds += parseInt(minutesLabel.innerHTML) * 60;
            seconds += parseInt(hoursLabel.innerHTML) * 3600;
            return seconds;
        },

        getTime = function() {
            var time = hoursLabel.innerHTML + ".";
            time += minutesLabel.innerHTML + ".";
            time += secondsLabel.innerHTML;
            return time;
        },

        argonFlowChange = function(val) {
            if (val > 0 && val <= 0.025)
                $stirringGasControl.sldr('value', 0);
            if (val > 0.025 && val < 0.05)
                $stirringGasControl.sldr('value', 0.05);

            bofView.argonFlowChange($stirringGasControl.sldr('value'));

            bosLog.storeMsg(getTime(), gt('argon_flow_changed') + ": " + parseFloat($stirringGasControl.sldr('value')).toFixed(2) + " m<sup>3</sup>/min/t");
        },

        tapSteel = function() {
            //Do not start tapping if lance is not retracted
            if (!bofView.lanceModel.isLanceRetracted()) {
                bofView.displayUserMessage(gt('not_tilt_furnace'), gt('not_tilt_furnace_msg'), true);
                return;
            }

            //Stop Argon and Nitrogen flow
            bofView.stopNitrogenFlow();

            //Start furnace rotation
            bofModel.startFurnaceRotation();
            bofView.startFurnaceRotation();

            $simulationRateControl.sldr('value', 32);

            clearInterval(bofModel.simRun);
            bofModel.simRun = setInterval(bofModel.update, 50);

        },

        startSimulation = function() {
            if (watchRun === -1) {
                watchRun = setInterval(watchRunning, 1000 / bofControl.simulationRate);
            }
            if (simRun === -1) {
                simRun = setInterval(bofModel.update, 300);
            }
        },

        endSimulation = function(s) {
            clearInterval(watchRun);
            watchRun = -1;
            clearInterval(simRun);
            simRun = -1;

            bofView.stop();

            switch (s) {
                case "solidification":
                    var msg = gt('solidified_msg') + ' ' + gt('solidified_msg1');
                    bosLog.storeMsg(getTime(), msg);
                    bofView.displayUserMessage(gt('solidified'), msg);
                    break;
                case "lance_failure":
                    var msg = gt('lance_failure_msg');
                    bosLog.storeMsg(getTime(), msg);
                    bofView.displayUserMessage(gt('lance_failure'), msg);
                    break;
                case "overheated":
                    var msg = gt('overheated_msg');
                    bosLog.storeMsg(getTime(), msg);
                    bofView.displayUserMessage(gt('overheated'), msg);
                    break;
                case "overflow":
                    var msg = gt('slag_overflow_msg');
                    bosLog.storeMsg(getTime(), msg);
                    bofView.displayUserMessage(gt('slag_overflow'), msg);
                    break;
                case "completed":
                    bosLog.storeMsg(getTime(), gt('tapping_complete'));
                    bosLog.storeMsg(getTime(), gt('tapping_mass') + ": " + bosLog.finalSteelMass);
                    finalSteelTemperature = bosLog.temperatureLog_array[bosLog.temperatureLog_array.length - 1];
                    bosLog.storeMsg(getTime(), gt('tapping_temperature') + ": " + finalSteelTemperature + " &deg;C");
                    bofView.displayFinalResults();
                    break;
            }
        };


    $simulationRateControl.on('sldrchange', function(event, ui) {
        changeSimulationRate(ui.value);
    });

    $('#oxygen_flow_control').on('sldrchange', function(event, ui) {
        bofView.lanceModel.oxygenFlowChange(ui.value);
        // if((e.type==='slidechange')&&(parseFloat(ui.value)==parseFloat(document.getElementById('oxygen_flow_rate').innerHTML))){
        //     bosLog.storeMsg(bofControl.getTime(), gt('oxygen_flow_changed') + ": " + parseFloat(ui.value).toFixed(2) + " Nm<sup>3</sup>/min/t");
        // }
    });

    $stirringGasControl.on('sldrchange', function(event, ui) {
        argonFlowChange(ui.value);
    });

    $('#lance_control .lance-retract').on('click', function(event) {
        bofView.lanceModel.lanceRetract();

        event.preventDefault();
    });

    $('#lance_control .lance-up').on('vmousedown', function(event) {
        bofView.lanceModel.lanceUp();
    });

    $('#lance_control .lance-down').on('vmousedown', function(event) {
        bofView.lanceModel.lanceDown();
    });

    $('#lance_control .button').not('.lance-retract').on('vmouseup', function(event) {
        bofView.lanceModel.lanceStop();
    });

    $('.open-analysis-results').on('click', function(event) {
        bofView.openAnalysisResultsDialog();

        event.preventDefault();
    })

    $('.take-sample').on('click', function(event) {
        bofView.lanceModel.takeSample();

        $(this).parents('.reveal-modal').foundation('reveal', 'close');

        event.preventDefault();
    });

    $('#tap_steel').on('click', function(event) {
        tapSteel();

        event.preventDefault();
    })




    window.bofControl = {
        startSimulation: startSimulation,
        endSimulation: endSimulation,
        getSecondsTotal: getSecondsTotal,
        getTime: getTime,
        simulationRate: simulationRate
    };
})(jQuery, document, window);
