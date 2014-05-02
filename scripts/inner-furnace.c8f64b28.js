window.initFurnace = function () {
    'use strict';
    (function(document, window) {
        var canvas = document.getElementById('inner_furnace'),
            ctx = canvas.getContext('2d'),
            canvasWidth = canvas.width,
            canvasHeight = canvas.height,

            steelLevelY = canvasHeight - bofModel.steelLevel,

            getSteelLevelM = function() {
                return (bofModel.steelLevel + upperContent.upperContentLevel) * bofView.STEEL_SCALE_FACTOR / bofView.SCALE_FACTOR_PX_M;
            },

            setBackground = function() {
                // ctx.canvas.width = ctx.canvas.width;
                var grd = ctx.createRadialGradient(canvasWidth / 2, 0, 5,
                    canvasWidth / 2, canvasHeight / 3 * 2, 150);
                grd.addColorStop(0, '#FFFFBF');
                grd.addColorStop(1, 'orange');
                ctx.fillStyle = grd;

                ctx.beginPath();
                ctx.moveTo(0, steelLevelY);
                ctx.lineTo(canvasWidth - 70, steelLevelY);
                ctx.lineTo(canvasWidth - 70, steelLevelY + bofModel.steelLevel + 10);
                ctx.lineTo((canvasWidth - 70) * 0.65, steelLevelY + bofModel.steelLevel + 40);
                ctx.lineTo(0, steelLevelY + bofModel.steelLevel + bofModel.steelLevel);
                ctx.lineTo(0, steelLevelY + bofModel.steelLevel);
                ctx.lineTo(0, steelLevelY);
                ctx.closePath();

                ctx.fill();
            },

            lowerSteel = function(amount) {
                ctx.clearRect(0, innerFurnace.steelLevelY - 30, ctx.canvas.width - 70, bofModel.steelLevel);
                innerFurnace.steelLevelY += 0.2;
                setBackground();
                var hotMetal = document.getElementById("hot_metal");
                var tempTop = (hotMetal.style.top === "") ? -15 : parseFloat(hotMetal.style.top.replace("px", ""));
                hotMetal.style.top = (tempTop > -85) ? tempTop - 0.5 : -85;
            };



        setBackground();

        window.innerFurnace = {
            init: setBackground,
            canvas: canvas,
            steelLevelY: steelLevelY,
            getSteelLevelM: getSteelLevelM,
            setBackground: setBackground,
            lowerSteel: lowerSteel
        }


    })(document, window);
    (function(document, window) {
        var ctx = innerFurnace.canvas.getContext('2d'),
            canvasWidth = ctx.canvas.width,
            canvasHeight = ctx.canvas.height,

            running = -1,
            upperContentLevel = 3,
            upperContentLevelY = innerFurnace.steelLevelY - upperContentLevel,
            totalPoints = 6,
            cWidth = 230,
            cMinX = -12,
            cMaxX = cWidth - Math.abs(cMinX),
            cHeight = upperContentLevel,

            points = [],

            // SLAG
            slagCtx = document.getElementById('slag').getContext('2d'),
            slagCanvasWidth = slagCtx.canvas.width,
            slagCanvasHeight = slagCtx.canvas.height,
            rateSpitting = 0,
            rateReturns = 0,
            rateFoaming = 0,
            currentFoamHeight = 0,
            currentFoamY = innerFurnace.steelLevelY,
            bottomLimit = 135,

            MAX_FOAM_HEIGHT = 11.3, // Maximum height that the foaming slag might reach [m]

            //Slag Bubbles
            bubbles = [],
            bubblesMinVel = 2,
            bubblesMaxVel = 4,
            maxNumberOfBubbles = 0,

            //Bubbles settings
            minRadius = 6,
            maxRadius = 8,
            bubbleColor = '#FFFFFF',

            //Spits
            spits = [],
            maxNumberOfSpits = 10,
            spitsYVel = 14,
            spitsXVel = 6,

            //Returns
            returns = [],
            maxNumberOfReturns = 20,
            returnsYVel = 3,
            returnsXVel = 8,

            start = function() {
                if (running === -1) {
                    running = setInterval(drawShape, 200);
                }
            },

            stop = function() {
                clearInterval(running);
                running = -1;
            },

            setColor = function() {
                var grd = ctx.createRadialGradient(stirringGas.canvasWidth / 2,
                    0, 5, canvasWidth / 2, canvasHeight / 3 * 2, 150);
                grd.addColorStop(0, '#FFFFBF');
                grd.addColorStop(1, 'orange');

                ctx.fillStyle = grd;
            },

            drawSquare = function() {
                ctx.fillRect(0, upperContentLevelY, canvasWidth, upperContent.upperContentLevel);
            },

            clearContent = function() {
                ctx.clearRect(0, 0, canvasWidth, innerFurnace.steelLevelY); //Clear the canvas
            },

            clearSlag = function() {
                slagCtx.clearRect(0, 0, slagCanvasWidth, slagCanvasHeight);
            },

            clear = function() {
                clearContent();
                clearSlag();
            },

            recalculatePoints = function(lancePosition, oxygenFlow) {
                var oxPower = (oxygenFlow == 0) ? 0 : 2 - (lancePosition / 3) + oxygenFlow,
                    wavesAmp = (oxPower > 1) ? 1 : 2;

                points[0] = [cMinX, upperContentLevelY - (oxPower * 2), 0, 0, 0];
                points[1] = [cWidth / 6 - oxPower, upperContentLevelY - oxPower, wavesAmp, 0, -1];
                points[2] = [cWidth / 3 - oxPower, upperContentLevelY + (oxPower / 2), wavesAmp, 0, 1];
                points[3] = [cWidth / 3 * 2 + oxPower, upperContentLevelY + (oxPower / 2), 1, 0, -0.5];
                points[4] = [cWidth / 6 * 5 + oxPower, upperContentLevelY - oxPower, wavesAmp, 0, 1];
                points[5] = [cWidth, upperContentLevelY - (oxPower * 2), wavesAmp, 0, -1];
            },
            drawShape = function() {
                clear();

                ctx.beginPath();
                ctx.moveTo(points[0][0], points[0][1]);

                for (var i = 1; i < totalPoints; i++) { //There is one wave fewer than points. Point 1 controls the first wave
                    if (Math.abs(points[i][3]) === points[i][2]) { //The wave has reached its amplitude
                        points[i][4] *= -1;
                    }
                    points[i][3] += points[i][4];

                    ctx.quadraticCurveTo((points[i][0] + points[i - 1][0]) / 2, (points[i][1] + points[i - 1][1]) / 2 + points[i][3],
                        points[i][0], points[i][1]);
                }

                ctx.lineTo(cWidth, innerFurnace.steelLevelY);
                ctx.lineTo(0, innerFurnace.steelLevelY);
                ctx.lineTo(points[0][0], points[0][1]);
                ctx.closePath();
                ctx.fill();

                //Slag
                upperContent.currentFoamY = innerFurnace.steelLevelY - (upperContent.currentFoamHeight * 12);
                upperContent.maxNumberOfBubbles = upperContent.currentFoamHeight * 3;
                if (upperContent.currentFoamHeight > 0) {
                    var foamY = upperContent.currentFoamY;

                    slagCtx.beginPath();
                    slagCtx.moveTo(cMinX, foamY);
                    for (i = 1; i < points.length; i++) { //There is one wave fewer than points. Point 1 controls the first wave
                        slagCtx.quadraticCurveTo(cWidth / 5 * i - cWidth / 10,
                            foamY - points[i][3], cWidth / 5 * i, foamY);
                    }

                    slagCtx.lineTo(cWidth, innerFurnace.steelLevelY);
                    slagCtx.lineTo(cMinX, innerFurnace.steelLevelY);
                    slagCtx.lineTo(cMinX, foamY);
                    slagCtx.closePath();

                    //Background gradient
                    var grd = slagCtx.createLinearGradient(0, 0, 0, slagCanvasHeight - foamY);
                    grd.addColorStop(0, '#F2CB9B');
                    grd.addColorStop(1, '#F7DEC1');
                    slagCtx.fillStyle = grd;

                    slagCtx.fill();

                    //Slag bubbles
                    bubbleDrawing();
                }

                //Spits
                spitDrawing();
                //Returns
                returnDrawing();
            },

            produceFoamBubbles = function() {
                var bubblesBuilt = i = 0;

                while (i < upperContent.maxNumberOfBubbles && bubblesBuilt < 2) {
                    if (bubbles[i]) {
                        //IF BUBBLE IS OFF PLACE, REBUILD (REUSE ARRAY POSITION)
                        if (bubbles[i].y <= upperContent.currentFoamY - bubbles[i].radius) {

                            bubbles[i] = buildBubble();
                            bubblesBuilt++;
                        }
                    } else {
                        bubbles[i] = buildBubble();
                        bubblesBuilt++;
                    }
                    i++;
                }
            },

            buildBubble = function() {
                var bubble = {};

                bubble.radius = randomXToY(minRadius, maxRadius);

                bubble.x = randomXToY(cMinX, cMaxX);
                bubble.y = bottomLimit - bubble.radius;
                bubble.yVel = randomXToY(bubblesMinVel, bubblesMaxVel);

                return bubble;
            },

            bubbleDrawing = function() {
                for (i = 0; i < upperContent.maxNumberOfBubbles; i++) {
                    if (bubbles[i]) {
                        bubbles[i].y = bubbles[i].y - bubbles[i].yVel;
                        drawBubble(bubbles[i]);
                    }
                }
            },

            drawBubble = function(obj) {
                slagCtx.beginPath();
                slagCtx.fillStyle = bubbleColor;
                slagCtx.globalAlpha = 0.8;
                slagCtx.arc((obj.x), (obj.y), (obj.radius), 0, Math.PI * 2, false);
                slagCtx.fill();
            },

            produceSpits = function() {
                var spitsBuilt = 0,
                    i = 0;

                while (i < upperContent.maxNumberOfSpits && spitsBuilt < upperContent.rateSpitting) {
                    if (spits[i]) {
                        //IF SPIT IS OFF PLACE, REBUILD (REUSE ARRAY POSITION)
                        if (spits[i].y <= 0 || spits[i].x <= cMinX || spits[i].x >= cMaxX) {
                            spits[i] = buildSpit();
                            spitsBuilt++;
                        }
                    } else {
                        spits[i] = buildSpit();
                        spitsBuilt++;
                    }
                    i++;
                }
            },

            buildSpit = function() {
                var spit = {};

                spit.x = randomXToY(cMinX, cMaxX);
                spit.y = bottomLimit;
                spit.yVel = spitsYVel;
                spit.xVel = randomXToY(spitsXVel * -1, spitsXVel);
                spit.img = "steel_bit" + randomXToY(1, 5);

                return spit;
            },

            spitDrawing = function() {
                for (i = 0; i < upperContent.maxNumberOfSpits; i++) {
                    if (spits[i]) {
                        spits[i].y = spits[i].y - spits[i].yVel;
                        spits[i].x = spits[i].x + spits[i].xVel;
                        drawSpit(spits[i]);
                    }
                }
            },

            drawSpit = function(obj) {
                var img = document.getElementById(obj.img);
                slagCtx.drawImage(img, obj.x, obj.y);
            },

            produceReturns = function() {
                var returnsBuilt = i = 0;

                while (i < upperContent.maxNumberOfReturns && returnsBuilt < upperContent.rateReturns * 4) {
                    if (returns[i]) {
                        //IF RETURN IS OFF PLACE, REBUILD (REUSE ARRAY POSITION)
                        if (returns[i].y >= bottomLimit || returns[i].x <= cMinX || returns[i].x >= cMaxX) {
                            returns[i] = buildReturn();
                            returnsBuilt++;
                        }
                    } else {
                        returns[i] = buildReturn();
                        returnsBuilt++;
                    }
                    i++;
                }
            },

            buildReturn = function() {
                var returnBit = {};

                returnBit.x = randomXToY(cMinX, cMaxX);
                returnBit.y = bottomLimit;
                returnBit.yVel = returnsYVel;
                returnBit.xVel = randomXToY(returnsXVel * -1, returnsXVel);
                returnBit.maxHeight = randomXToY(bottomLimit, bottomLimit / 3 * 2);
                returnBit.img = "steel_bit" + randomXToY(1, 5);

                return returnBit;
            },

            returnDrawing = function() {
                for (i = 0; i < upperContent.maxNumberOfReturns; i++) {
                    if (returns[i]) {
                        if (returns[i].y < returns[i].maxHeight) {
                            returns[i].yVel = returns[i].yVel * -1;
                        }
                        returns[i].y = returns[i].y - returns[i].yVel;
                        returns[i].x = returns[i].x + returns[i].xVel;
                        drawReturn(returns[i]);
                    }
                }
            },

            drawReturn = function(obj) {
                var img = document.getElementById(obj.img);
                slagCtx.drawImage(img, obj.x, obj.y);
            },

            init = function() {
                setColor();
                drawSquare();

                points[0] = new Array(cMinX, upperContentLevelY, 0, 0, 0); // (x, y, waveAmp, waveYPos, waveSpeed)
                points[1] = new Array(cWidth / 6, upperContentLevelY, 2, 0, -1);
                points[2] = new Array(cWidth / 3, upperContentLevelY, 2, 0, 1);
                points[3] = new Array(cWidth / 3 * 2, upperContentLevelY, 1, 0, -0.5);
                points[4] = new Array(cWidth / 6 * 5, upperContentLevelY, 2, 0, 1);
                points[5] = new Array(cWidth, upperContentLevelY, 2, 0, -1);

                start();
            };


        window.upperContent = {
            MAX_FOAM_HEIGHT: MAX_FOAM_HEIGHT,
            upperContentLevel: upperContentLevel,
            currentFoamHeight: currentFoamHeight,
            currentFoamY: currentFoamY,
            rateFoaming: rateFoaming,
            rateReturns: rateReturns,
            maxNumberOfReturns: maxNumberOfReturns,
            rateSpitting: rateSpitting,
            maxNumberOfSpits: maxNumberOfSpits,
            recalculatePoints: recalculatePoints,
            produceSpits: produceSpits,
            produceReturns: produceReturns,
            produceFoamBubbles: produceFoamBubbles,
            init: init,
            stop: stop,
        }
    })(document, window);
}

