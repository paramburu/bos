(function(document, window) {
    'use strict';

    var ctx = document.getElementById('stirring_gas').getContext('2d'),
        canvasWidth = ctx.canvas.width,
        canvasHeight = ctx.canvas.height,

        running = -1,

        bubblesMinVel = 1,
        bubblesMaxVel = 2,
        maxNumberOfBubbles = 15,

        bubbles = [],

        //Bubbles setting,
        minRadius = 2,
        maxRadius = 2.5,
        bubbleColor = '#FFFFFF',

        start = function() {
            if (running == -1) {
                running = setInterval(bubbleDrawing, 100);
            }
        },

        stop = function() {
            clearInterval(running);
            running = -1;
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        },

        buildBubble = function() {
            var bubble = {};

            bubble.radius = randomXToY(minRadius, maxRadius);

            bubble.y = canvasHeight - bubble.radius;

            if (betweenZeroAnd(2) == 1) { //LEFT SIDE
                bubble.x = 52;
            } else { //RIGHT SIDE
                bubble.x = 177;
            }

            bubble.yVel = randomXToY(bubblesMinVel, bubblesMaxVel);

            return bubble;
        },

        bubbleDrawing = function() {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);

            for (i = 0; i < stirringGas.maxNumberOfBubbles; i++) {
                if (bubbles[i]) {
                    bubbles[i].y = bubbles[i].y - bubbles[i].yVel;
                    bubbles[i].x = bubbles[i].x + randomXToY(-2, 2);

                    //IF BUBBLE IS OFF PLACE, REBUILD
                    if (bubbles[i].y <= innerFurnace.steelLevelY - upperContent.upperContentLevel - bubbles[i].radius) {
                        bubbles[i] = buildBubble();
                    }
                } else {
                    bubbles[i] = buildBubble();
                }
                drawBubble(bubbles[i]);
            }
        },

        drawBubble = function(obj) {
            ctx.beginPath();
            ctx.fillStyle = bubbleColor;
            ctx.globalAlpha = 0.8;
            ctx.arc((obj.x), (obj.y), (obj.radius), 0, Math.PI * 2, false);
            ctx.fill();
        },

        init = function() {
            for (i = 0; i < stirringGas.maxNumberOfBubbles; i++) {
                bubbles[i] = buildBubble();
            }

            start();
        };


    window.stirringGas = {
        canvasWidth: canvasWidth,
        canvasHeight: canvasHeight,
        maxNumberOfBubbles: maxNumberOfBubbles,

        init: init,
        stop: stop
    }

})(document, window);
