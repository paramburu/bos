function BOSLog() {

    this.ANALYSIS_COST = 120;
    // Cost of oxygen in US$/Nm³
    this.OXYGEN_COST = 0.1;
    // Cost of nitrogen in US$/Nm³
    this.NITROGEN_COST = 0.07;
    // Cost of argon in US$/Nm³
    this.ARGON_COST = 0.7;
    // Cost of refractory wear in US$/tonne steel
    this.MIN_REFRACTORY_COST = 2.5;
    this.MAX_REFRACTORY_COST = 5;
    // Cost of re-blow, i.e. additional cost for not hitting the target of T, %C or %P,
    // resulting in having to do a re-blow in US$/tonne steel
    this.REBLOW_COST = 8;

    // Operating costs
    this.analysisCost = 0;
    this.additionsCost = 0;
    this.hotMetalCost = 0;

    // Consumptions
    // Volumes in Nm³
    this.consumedArgonVolume = 0;
    this.consumedNitrogenVolume = 0;
    this.consumedOxygenVolume = 0;
    this.refractoryCostFactor = 0;

    // Total steel mass before tapping
    this.finalSteelMass = 0;
    // Final steel composition before tapping
    this.finalSteelComposition;

    // Values that are logged each minute
    // Time in minutes, Temperatures, Steel compositions, Slag compositions
    this.timeLog_array = new Array();
    this.temperatureLog_array = new Array();
    this.steelCompLog_array = new Array();
    this.slagCompLog_array = new Array();

    // Array of logged messages
    this.msg_array = new Array();

    // Stores a message in the logger instance
    this.storeMsg = function(d, msg) {
        this.msg_array.push([d, msg]);
        document.getElementById("events_log_body").innerHTML += d + " :  " + msg + "<br>";
    }

    /***
     * Adds cost
     *   @param  c   cost
     *   @param  s   short string describing type of cost (valid are: electrode, addition, scrap)
     */
    this.addCost = function(s, c) {
        switch (s) {
            case "refractory":
                break;
            case "analysis":
                this.analysisCost += this.ANALYSIS_COST;
                break;
            case "addition":
            case "additions":
                this.additionsCost += c;
                break;
            case "hotmetal":
                this.hotMetalCost += c;
                break;
        }
    }

    // Returns the total production cost
    this.getTotalCost = function() {
        var totalCost = this.hotMetalCost + this.additionsCost + this.getConsumablesCost();
        //output_txt.text = "$"+Math.round(totalCost*100)/100;
        if (bofModel.steel.mass > 0) {
            var costPerTonne = Math.round(totalCost * 100 / (bofModel.steel.mass / 1000)) / 100;
            //output_txt.text += "\n$"+costPerTonne+"/tonne";
        } else {
            //output_txt.text += "\n N/A";
        }
        return totalCost;
    }

    this.getConsumablesCost = function() {
        var c = this.analysisCost + this.getGasCost() + this.getRefractoryCost();
        return (Math.round(c));
    }

    this.getGasCost = function() {
        return (this.consumedOxygenVolume * this.OXYGEN_COST + this.consumedArgonVolume * this.ARGON_COST + this.consumedNitrogenVolume * this.NITROGEN_COST);
    }

    this.getRefractoryCost = function() {
        // Randomly decide the refractory cost per tonne for the heat (only once per instantiation of BosValuesLog
        if (this.refractoryCostFactor == 0) {
            this.refractoryCostFactor = this.MIN_REFRACTORY_COST + Math.random() * (this.MAX_REFRACTORY_COST - this.MIN_REFRACTORY_COST);
        }
        return (this.refractoryCostFactor * bofModel.steel.mass / 1000);
    }

    /* Stores vales from the simulation
     *   @param      ti      Time / s
     *   @param      te      Temperature / °C
     *   @param      stc     Steel composition array / fractions
     *   @param      slc     Slag composition array / fractions
     */
    this.storeValues = function(ti, te, stc, slc) {
        this.timeLog_array.push(ti);
        this.temperatureLog_array.push(te);
        this.steelCompLog_array.push(stc.concat());
        this.slagCompLog_array.push(slc.concat());

        /*Steel Composition Graph*/
        bofView.steelCompositionGraph.get('C').addPoint(stc[bofModel.getElementIndex("C")] * 100);
        bofView.steelCompositionGraph.get('Si').addPoint(stc[bofModel.getElementIndex("Si")] * 100);
        bofView.steelCompositionGraph.get('Mn').addPoint(stc[bofModel.getElementIndex("Mn")] * 100);
        bofView.steelCompositionGraph.get('P').addPoint(stc[bofModel.getElementIndex("P")] * 100);

        /*Slag Composition Graph*/
        bofView.slagCompositionGraph.get('SiO2').addPoint(slc[bofModel.getCompoundIndex("SiO2")] * 100);
        bofView.slagCompositionGraph.get('FeO').addPoint(slc[bofModel.getCompoundIndex("FeO")] * 100);
        bofView.slagCompositionGraph.get('MnO').addPoint(slc[bofModel.getCompoundIndex("MnO")] * 100);
        bofView.slagCompositionGraph.get('CaO').addPoint(slc[bofModel.getCompoundIndex("CaO")] * 100);
        bofView.slagCompositionGraph.get('MgO').addPoint(slc[bofModel.getCompoundIndex("MgO")] * 100);

        /*Melting Path Graph*/
        bofView.meltingPathGraph.series[0].addPoint([stc[bofModel.getElementIndex("C")] * 100, te]);
    }
}
