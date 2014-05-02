(function() {
    //RETURNS NUMBER BETWEEN X AND Y, FLOAT VAL IS DECIMAL PLACES
    var randomXToY = function(minVal, maxVal, floatVal) {
            var randVal = minVal + (Math.random() * (maxVal - minVal));
            return typeof floatVal == 'undefined' ? Math.round(randVal) : randVal.toFixed(floatVal);
        },
        betweenZeroAnd = function(num) {
            return Math.floor(Math.random() * (num))
        };


    window.randomXToY = randomXToY;
    window.betweenZeroAnd = betweenZeroAnd;
})();
