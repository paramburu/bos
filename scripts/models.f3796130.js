var scrapPositioning = (function () {
    var scrapImg = $('#furnace_scrap'),
        defaultPos = parseFloat(scrapImg.css('bottom'));

    var updatePosition = function (offset) {
        console.log('scrap', offset);
        scrapImg.css('bottom', defaultPos + offset);
    };

    return updatePosition;
})(document);

function BOFModel(sg) {
    this.lastRun = 0;

    this.steelLevel = 15;

    this.userLevel = (document.getElementById("student_radio").checked) ? "university_student" : "steel_worker";

    // ---------- STEELDATA CONSTANTS ------------
    /**
     * Typical density of solid steel, in kg/m^3.
     */
    var STEEL_DENSITY_SOLID = 7900;
    /**
     * Typical density of liquid steel, in kg/m^3.
     */
    var STEEL_DENSITY_LIQUID = 7400;
    /**
     * Typical liquidus temperature of steel, in °C.
     */
    var FE_MELTING_TEMP = 1537;
    /**
     * Typical density of liquid slag, in kg/m^3.
     */
    var SLAG_DENSITY_LIQUID = 2500;
    /**
     * Typical density of solid slag, in kg/m^3.
     */
    var SLAG_DENSITY_SOLID = 3500;


    // ---------- PHYSICAL CONSTANTS ------------

    /**
     * Gas constant, <em>R</em>, equivalent to 8.31433 J/K/mol.
     */
    var GAS_CONSTANT = 8.31433;

    // Steel grade being produced
    this.steelGrade = new SteelGrade(sg);

    // CHEMICAL ANALYSIS
    // Time delay for analysis in seconds
    this.ANALYSIS_TIME_DELAY = 180;
    // Flag for showing if an analysis is pending
    // :NOTE: This parameter is intentionally left undefined, DO NOT define it here or before first analysis is made
    this.analysisPending = false;
    // Time of request of new chemical analysis
    this.requestTime;
    // Time at which to display results
    this.resultsTime;
    // Last good composition analysis
    this.lastGoodComposition = new Array();
    // Last measured steel temperature
    this.lastMeasuredTemperature;
    // Time for last analysis
    this.lastAnalysisTime;

    // PHASES
    // Material contents of the furnace
    this.solid = new SolidPhase(); // Handles multiple phases within the solid
    this.steel = new Phase("Steel", 0, 0, STEEL_DENSITY_LIQUID);
    this.slag = new Phase("Slag", 0, 0, SLAG_DENSITY_LIQUID);
    // Gas density based on hydrogen
    this.gas = new Phase("Gas", 0, 0, 0.023);;
    var foamingSlag = false;
    this.accOxygenVolume = 0;
    var T_liquidus = 0;
    // Temperature at which the steel will solidify in the vessel
    var MAX_UNDERCOOLING = 100;
    // Maximum temperature before a breakout occurs, i.e. the lining of the furnace breaks, in °C
    var MAX_STEEL_TEMPERATURE = 1900;

    // OXIDATION REACTION PARAMETERS
    var ALPHA = 0.98; //0.93+Math.random()*.1;
    var BETA = 0.015; //0.25+Math.random()*.1;

    // ENERGY PARAMETERS
    // Heat loss during blowing of oxygen in MJ/min/kg
    var HEAT_LOSS_BLOWING = 4 * 1000;
    // Normal heat loss in MJ/min/kg
    var HEAT_LOSS_NORMAL = 0.5 * 1000;
    // Total amount of energy available in the system
    var dH_tot = 0;
    var FRACTION_FOR_MELTING = 0.5;

    // GAS PARAMETRES
    var dV_O2 = 0;
    var dV_N2 = 0;
    var dV_Ar = 0;
    var dV_tot_gas = 0;
    var dV_O2_MAX = 3;
    var argonFlowRate = 0;
    this.MAX_OX_RATE_FOR_ANALYSIS = 2.0;
    //var MAX_ARGON_FLOWRATE = 0.15;
    //var MIN_ARGON_FLOWRATE = 0.05;
    //var argonRateText = "";
    //var oldArgonFlowRate = 0;

    // MISCELLANEOUS
    // Dimensions, approximate only...
    this.INTERNAL_AREA = 50; // m2
    var INTERNAL_HEIGHT = 9.5; // m
    // This parameter is used for showing alerts to the user.
    var showAlert = "";
    // Outlet area of tap hole
    var OUTLET_AREA = 0.05;

    // Flag for End of Simulation
    var isEoS = false;
    // Interval ID for setIntervals relating to the argon rate control
    var intervalArID = 0;
    // Delay time before registering a user invoked change of setting in milliseconds
    var USER_ACTION_DELAY = 500;

    // TEMPORARY
    var mFeO_tot = 0;

    // FURNACE
    // Flag that tells if tapping has commenced
    this.tapping = false;
    this.rotationVelocity = 0;
    this.rotationAngle = 0;
    this.UPRIGHT_ANGLE = 0;
    this.START_TAP_ANGLE = 85;
    this.TAPPING_ANGLE = 95;
    this.ROTATE_SPEED = 0.5;
    // Flow rate at tapping in kg/s
    this.TAPPING_FLOW_RATE = 1000;

    //From Class Element
    /***
    Symbol  Index   AtomicMass  RecoveryRate    LiquidusCoefficient ElementColor    Oxide   Reducable
    "Fe"    0       55.847      100             0                   0x000000        "FEO"   false
    "C"     1       12.0107     95              0                   0x000000        "CO"    true
    "Si"    2       28.0855     98              -14.0               0x6B6BEFE       "SIO2"  true
    "Mn"    3       54.938      95              -4.0                0x0099CC        "MNO"   true
    "P"     4       30.974      98              -30.0               0x000066        ""      false
    "S"     5       32.066      80              -45.0               0xFFFF00        ""      true
    "Cr"    6       51.966      99              -1.5                0x0BB57D        "CR2O3" false
    "Mo"    7       95.94       100             -5.0                0xC082C1        "MOO3"  false
    "Ni"    8       58.6934     100             -3.5                0x3C7B84        ""      false
    "Al"    9       26.9815     90              -2.5                0xA2A2C1        "AL2O3" true
    "Ar"    10      39.948      100             0                   0x000000        ""      false
    "As"    11      74.92       100             0                   0xB7B78C        ""      false
    "B"     12      10.811      100             0                   0x996666        ""      false
    "Ca"    13      40.078      15              0                   0x258F25        "CAO"   false
    "Ce"    14      140.116     100             0                   0x000000        ""      false
    "Co"    15      58.933      100             0                   0x000000        ""      false
    "Cu"    16      63.546      100             0                   0xE69D68        ""      false
    "H"     17      1.0079      100             0                   0xFFFFFF        ""      true
    "Mg"    18      24.305      100             0                   0x000000        "MGO"   false
    "N"     19      14.00674    40              0                   0x00FF00        ""      true
    "Nb"    20      92.906      100             0                   0x9FC4A0        ""      false
    "O"     21      15.9994     100             0                   0xFF0000        ""      true
    "Pb"    22      207.2       100             0                   0x000000        "PBO"   false
    "Sn"    23      118.71      100             0                   0xDCDC87        ""      false
    "Ti"    24      47.867      90              0                   0xFF00FF        "TIO2"  false
    "V"     25      50.9415     100             4.0                 0xC67D95        "V2O5"  false
    "W"     26      183.84      100             0                   0x000000        ""      false
    "Zn"    27      65.39       100             0                   0x000000        ""      false

    //From Class Compound
    Symbol  Index   MolecularMass   NoCations   NoAnions
    "Al2O3" 0       101.9612        2           3
    "CaF2"  1       78.0748         1           2
    "CaO"   2       56.0774         1           1
    "CO"    3       28.0101         1           1
    "Cr2O3" 4       151.9302        2           3
    "FeO"   5       71.8464         1           1
    "H2"    6       2.0158          0           0
    "H2O"   7       18.0152         2           1
    "MgO"   8       40.3044         1           1
    "MnO"   9       70.9374         1           1
    "MoO3"  10      143.9382        1           3
    "N2"    11      28.01348        0           0
    "O2"    12      31.9988         0           0
    "PbO"   13      223.1994        1           1
    "SiO2"  14      60.0843         1           2
    "TiO2"  15      79.8658         1           2
    "V2O5"  16      181.88          2           5
    "(P)"   17      30.974          0           0
    "(S)"   18      32.065          0           0
    ****/

    this.init = function() {
        //Convert user selections into Model objects
        //From Main movie ActionScript Frames 1 and 7

        var metal;
        var oxide;
        var no_oxide = new ChemicalComposition();
        var no_metal = new ChemicalComposition();
        var tempMat;
        var tempMass;
        var str = gt('additions') + ": ";

        bosLog.storeMsg("00.00.00", gt('selected_user_level') + ": " + ((document.getElementById("student_radio").checked) ? gt('university_student') : gt('steel_worker')));
        bosLog.storeMsg("00.00.00", gt('selected_steel_grade') + ": " + this.steelGrade.name);

        //Hot Metal
        tempMass = parseFloat(document.getElementById("materials_hot_metal_mass").value) * 1000;
        if (tempMass > 0) {
            metal = new ChemicalComposition(new ChemicalComponent("Fe", 0));
            metal.addData(new ChemicalComponent("C", 1), 0.045);
            metal.addData(new ChemicalComponent("Mn", 3), 0.005);
            metal.addData(new ChemicalComponent("Si", 2), 0.004);
            metal.addData(new ChemicalComponent("P", 4), 0.0008);
            metal.addData(new ChemicalComponent("S", 5), 0.0002);
            metal.addData(new ChemicalComponent("O", 21), 0);
            tempMat = new Material("HM", "Hot Metal", "Major addition", "Hot Metal", 3.0, 185, metal, no_oxide, 1.0);
            this.addMaterial(new MaterialAmount(tempMat, tempMass), parseFloat(document.getElementById("hot_metal_temperature").value) + 273);
            str += tempMass + " kg " + gt('hot_metal') + "; "
        }
        bosLog.addCost("hotmetal", tempMass * 0.185);

        // Light scrap
        tempMass = parseFloat(document.getElementById("materials_light_scrap_mass").value);
        if (tempMass > 0) {
            metal = new ChemicalComposition(new ChemicalComponent("FE", 0));
            metal.addData(new ChemicalComponent("C", 1), 0.0005);
            metal.addData(new ChemicalComponent("Mn", 3), 0.0012);
            metal.addData(new ChemicalComponent("Si", 2), 0);
            metal.addData(new ChemicalComponent("P", 4), 0.00015);
            metal.addData(new ChemicalComponent("S", 5), 0.00015);
            metal.addData(new ChemicalComponent("O", 21), 0.0006);
            metal.addData(new ChemicalComponent("Ce", 14), 0.00003); // Added for reality
            metal.addData(new ChemicalComponent("Cr", 6), 0.0026); // Added for reality
            metal.addData(new ChemicalComponent("Cu", 16), 0.0002); // Added for reality
            metal.addData(new ChemicalComponent("Mo", 7), 0.0014); // Added for reality
            metal.addData(new ChemicalComponent("Nb", 20), 0.00001); // Added for reality
            metal.addData(new ChemicalComponent("Ni", 8), 0.004); // Added for reality
            metal.addData(new ChemicalComponent("Sn", 23), 0.00001); // Added for reality
            metal.addData(new ChemicalComponent("Ti", 24), 0.00015); // Added for reality
            metal.addData(new ChemicalComponent("V", 25), 0.00005); // Added for reality
            metal.addData(new ChemicalComponent("W", 26), 0.00009); // Added for reality
            tempMat = new Material("LS", "Light Scrap", "Major addition", "Light Scrap", 1.0, 190, metal, no_oxide, 1.0);
            this.addMaterial(new MaterialAmount(tempMat, tempMass / 1000), 298);
            str += tempMass + " kg " + gt('light_scrap') + "; "
        }
        bosLog.addCost("additions", tempMass * 0.19);

        // Heavy scrap
        tempMass = parseFloat(document.getElementById("materials_heavy_scrap_mass").value);
        if (tempMass > 0) {
            metal = new ChemicalComposition(new ChemicalComponent("FE", 0));
            metal.addData(new ChemicalComponent("C", 1), 0.0005);
            metal.addData(new ChemicalComponent("Mn", 3), 0.0012);
            metal.addData(new ChemicalComponent("Si", 2), 0);
            metal.addData(new ChemicalComponent("P", 4), 0.00015);
            metal.addData(new ChemicalComponent("S", 5), 0.00015);
            metal.addData(new ChemicalComponent("O", 21), 0.0006);
            metal.addData(new ChemicalComponent("Ce", 14), 0.00003); // Added for reality
            metal.addData(new ChemicalComponent("Cr", 6), 0.0026); // Added for reality
            metal.addData(new ChemicalComponent("Cu", 16), 0.0002); // Added for reality
            metal.addData(new ChemicalComponent("Mo", 7), 0.0014); // Added for reality
            metal.addData(new ChemicalComponent("Nb", 20), 0.00001); // Added for reality
            metal.addData(new ChemicalComponent("Ni", 8), 0.004); // Added for reality
            metal.addData(new ChemicalComponent("Sn", 23), 0.00001); // Added for reality
            metal.addData(new ChemicalComponent("Ti", 24), 0.00015); // Added for reality
            metal.addData(new ChemicalComponent("V", 25), 0.00005); // Added for reality
            metal.addData(new ChemicalComponent("W", 26), 0.00009); // Added for reality
            tempMat = new Material("HS", "Heavy Scrap", "Major addition", "Heavy Scrap", 3.0, 150, metal, no_oxide, 1.0);
            this.addMaterial(new MaterialAmount(tempMat, tempMass / 1000), 298);
            str += tempMass + " kg " + gt('heavy_scrap') + "; "
        }
        bosLog.addCost("additions", tempMass * 0.15);

        // Iron Ore     (3)         99.1%FEO
        tempMass = parseFloat(document.getElementById("materials_iron_mass").value);
        if (tempMass > 0) {
            oxide = new ChemicalComposition(new ChemicalComponent("FeO", 5));
            oxide.addData(new ChemicalComponent("Al2O3", 0), 0.003);
            oxide.addData(new ChemicalComponent("CaO", 2), 0.005);
            oxide.addData(new ChemicalComponent("MgO", 8), 0.001);
            oxide.addData(new ChemicalComponent("P", 17), 0.00001);
            tempMat = new Material("IO", "Iron Ore", "Minor addition", "Powder", 1.8, 85, no_metal, oxide, 0);
            this.addMaterial(new MaterialAmount(tempMat, tempMass / 1000), 298);
            str += tempMass + " kg " + gt('iron_ore') + "; "
        }
        bosLog.addCost("additions", tempMass * 0.085);

        // Lime         (4)         94.9%CAO, 1.2%AL2O3, 1.8%MGO, 2.1%SIO2
        tempMass = parseFloat(document.getElementById("materials_lime_mass").value);
        if (tempMass > 0) {
            oxide = new ChemicalComposition(new ChemicalComponent("CaO", 2));
            oxide.addData(new ChemicalComponent("Al2O3", 0), 0.012);
            oxide.addData(new ChemicalComponent("MgO", 8), 0.018);
            oxide.addData(new ChemicalComponent("SiO2", 14), 0.021);
            oxide.addData(new ChemicalComponent("P", 17), 0.0001);
            oxide.addData(new ChemicalComponent("S", 18), 0.0001);
            tempMat = new Material("LI", "Lime", "Slag", "Powder", 1.0, 85, no_metal, oxide, 0);
            this.addMaterial(new MaterialAmount(tempMat, tempMass / 1000), 298);
            str += tempMass + " kg " + gt('lime') + "; "
        }
        bosLog.addCost("additions", tempMass * 0.085);

        // Dolomite     (5)         59.5%CAO, 38.5%MGO, 2%SIO2
        tempMass = parseFloat(document.getElementById("materials_dolomite_mass").value);
        if (tempMass > 0) {
            oxide = new ChemicalComposition(new ChemicalComponent("CaO", 2));
            oxide.addData(new ChemicalComponent("MgO", 8), 0.385);
            oxide.addData(new ChemicalComponent("SiO2", 14), 0.02);
            oxide.addData(new ChemicalComponent("P", 17), 0.00005);
            oxide.addData(new ChemicalComponent("S", 18), 0.0015);
            tempMat = new Material("DO", "Dolomite", "Slag", "Powder", 1.0, 85, no_metal, oxide, 0);
            this.addMaterial(new MaterialAmount(tempMat, tempMass / 1000), 298);
            str += tempMass + " kg " + gt('dolomite') + "; "
        }
        bosLog.addCost("additions", tempMass * 0.085);

        str = str.slice(0, -2);
        bosLog.storeMsg("00.00.00", str);

        bosLog.storeMsg("00.00.00", gt('hot_metal_temperature') + ": " + (document.getElementById("hot_metal_temperature").value) + " &deg; C");

        bosLog.storeMsg("00.00.00", gt('nitrogen_flow_rate') + ": " + (document.getElementById("stirring_gas_rate").value) + " Nm<sup>3</sup>/min/tonne");
    }

    this.getElementsArray = function() {
        var elementsArray = new Array();
        elementsArray[0] = "C";
        elementsArray[1] = "Si";
        elementsArray[2] = "Mn";
        elementsArray[3] = "P";
        elementsArray[4] = "S";
        elementsArray[5] = "Cr";
        elementsArray[6] = "Al";
        elementsArray[7] = "B";
        elementsArray[8] = "Ni";
        elementsArray[9] = "Nb";
        elementsArray[10] = "Ti";
        elementsArray[11] = "V";
        elementsArray[12] = "Mo";
        elementsArray[13] = "Ca";
        elementsArray[14] = "N";
        elementsArray[15] = "H";
        elementsArray[16] = "O";
        return elementsArray;
    }

    this.getOxideArray = function() {
        var oxideArray = new Array();
        oxideArray[0] = "Al2O3";
        oxideArray[1] = "CaO";
        oxideArray[2] = "Cr2O3";
        oxideArray[3] = "FeO";
        oxideArray[4] = "MgO";
        oxideArray[5] = "MnO";
        oxideArray[6] = "SiO2";
        oxideArray[7] = "V2O5";
        oxideArray[8] = "(P)";
        oxideArray[9] = "(S)";
        return oxideArray;
    }

    this.makeAnalysis = function() {
        this.analysisPending = true;
        this.lastGoodComposition = this.steel.composition;
        this.lastSteelTemperature = this.steel.temperature;
        this.lastAnalysisTime = bofControl.getTime();
        //trace("t: "+timerModel.getTime());
        this.requestTime = bofControl.getSecondsTotal();
        this.resultsTime = this.requestTime + this.ANALYSIS_TIME_DELAY;

        // Display partial analysis
        var str = "";
        str += "<tr><td>C</td><td>" + parseFloat(this.steel.composition[this.getElementIndex("C")] * 100).toFixed(3) + "&nbsp;wt-%</td>";
        str += "<td>" + parseFloat(this.steelGrade.minimumComposition.componentArray[this.getElementIndex("C")].fraction).toFixed(3) + "&nbsp;wt-%</td>";
        str += "<td>" + parseFloat(this.steelGrade.maximumComposition.componentArray[this.getElementIndex("C")].fraction).toFixed(3) + "&nbsp;wt-%</td></tr>";
        $('#partial_analysis_results_body tbody')[0].innerHTML = str;
        str = "<tr><td colspan=4>" + gt('steel_temperature') + ": " + parseInt(this.steel.temperature - 273) + " &deg;C</td></tr>";
        $('#partial_analysis_results_body tfoot')[0].innerHTML = str;

        bofView.displayPartialAnalysisResults(str);
    }

    this.getIsReducable = function(sym) {
        switch (sym.toUpperCase()) {
            case "C":
            case "SI":
            case "MN":
            case "S":
            case "C":
            case "AL":
            case "N":
            case "H":
            case "O":
                return true;
            default:
                return false;
        }
    }

    this.getElementIndex = function(sym) {
        switch (sym.toUpperCase()) {
            case "FE":
                return 0;
            case "C":
                return 1;
            case "SI":
                return 2;
            case "MN":
                return 3;
            case "P":
                return 4;
            case "S":
                return 5;
            case "CR":
                return 6;
            case "MO":
                return 7;
            case "NI":
                return 8;
            case "AL":
                return 9;
            case "AR":
                return 10;
            case "AS":
                return 11;
            case "B":
                return 12;
            case "CA":
                return 13;
            case "CE":
                return 14;
            case "CO":
                return 15;
            case "CU":
                return 16;
            case "H":
                return 17;
            case "MG":
                return 18;
            case "N":
                return 19;
            case "NB":
                return 20;
            case "O":
                return 21;
            case "PB":
                return 22;
            case "SN":
                return 23;
            case "TI":
                return 24;
            case "V":
                return 25;
            case "W":
                return 26;
            case "ZN":
                return 27;
        }
    }

    this.getElementMolecularMass = function(sym) {
        switch (sym.toUpperCase()) {
            case "FE":
                return 55.847;
            case "C":
                return 12.0107;
            case "SI":
                return 28.0855;
            case "MN":
                return 54.938;
            case "P":
                return 30.974;
            case "S":
                return 32.066;
            case "CR":
                return 51.966;
            case "MO":
                return 95.94;
            case "NI":
                return 58.6934;
            case "AL":
                return 26.9815;
            case "AR":
                return 39.948;
            case "AS":
                return 74.92;
            case "B":
                return 10.811;
            case "CA":
                return 40.078;
            case "CE":
                return 140.116;
            case "CO":
                return 58.933;
            case "CU":
                return 63.548;
            case "H":
                return 1.0079;
            case "MG":
                return 24.305;
            case "N":
                return 14.00674;
            case "NB":
                return 92.906;
            case "O":
                return 15.9994;
            case "PB":
                return 207.2;
            case "SN":
                return 118.71;
            case "TI":
                return 47.867;
            case "V":
                return 50.9415;
            case "W":
                return 183.84;
            case "ZN":
                return 65.39;
        }
    }

    this.getCompoundIndex = function(sym) {
        switch (sym.toUpperCase()) {
            case "AL2O3":
                return 0;
            case "CAF2":
                return 1;
            case "CAO":
                return 2;
            case "CO":
                return 3;
            case "CR2O3":
                return 4;
            case "FEO":
                return 5;
            case "H2":
                return 6;
            case "H2O":
                return 7;
            case "MGO":
                return 8;
            case "MNO":
                return 9;
            case "MOO3":
                return 10;
            case "N2":
                return 11;
            case "O2":
                return 12;
            case "PBO":
                return 13;
            case "SIO2":
                return 14;
            case "TIO2":
                return 15;
            case "V2O5":
                return 16;
            case "P":
            case "(P)":
                return 17;
            case "S":
            case "(S)":
                return 18;
        }
    }

    this.getCompoundMolecularMass = function(sym) {
        switch (sym.toUpperCase()) {
            case "AL2O3":
                return 101.9612;
            case "CAF2":
                return 78.0748;
            case "CAO":
                return 56.0774;
            case "CO":
                return 28.0101;
            case "CR2O3":
                return 151.9302;
            case "FEO":
                return 71.8464;
            case "H2":
                return 2.0158;
            case "H2O":
                return 18.0152;
            case "MGO":
                return 40.3044;
            case "MNO":
                return 70.9374;
            case "MOO3":
                return 143.9382;
            case "N2":
                return 28.01348;
            case "O2":
                return 31.9988;
            case "PBO":
                return 223.1994;
            case "SIO2":
                return 60.0843;
            case "TIO2":
                return 79.8658;
            case "V2O5":
                return 181.88;
            case "P":
                return 30.974;
            case "S":
                return 32.065;
        }
    }

    // ------------------------- UDPATE - Recalculates the furnace state --------------------//
    this.update = function() {
        var seconds = bofControl.getSecondsTotal();
        var deltaTime = seconds - bofModel.lastRun;
        if (deltaTime == 0)
            return;

        bofView.lanceModel.checkLanceSubmerged(deltaTime);

        // --- GAS FLOW RATES --- //
        // lanceModel.getOxygenFlow(), BosUserSelections.getInstance().getNitrogenRate() and getArgonFlowRate()
        // returns flow as Nm³/min/tonne and are converted to Nm³
        // Flow-rates are around 0.05 - 0.1 during main blow (N2) and up to 0.15 - 0.25 (Ar) during after blow.
        // Nitrogen is usually used during main deC period (cheaper) and they switch to argon after that (to prevent N pick-up).
        var c = ((bofModel.steel.mass / 1000) / 60) * deltaTime;

        var nitrogenFlowRate = parseFloat(document.getElementById("stirring_gas_rate").value);
        dV_O2 = parseFloat($('#oxygen_flow_control').sldr('value')) * c;
        bofModel.accOxygenVolume += dV_O2;

        dV_Ar = parseFloat($('#stirring_gas_control').sldr('value')) * c;

        // Let the nitrogen flow be 0 if argon stirring is on
        dV_N2 = (dV_Ar > 0) ? 0 : nitrogenFlowRate * c;
        dV_tot_gas = dV_O2 + dV_N2 + dV_Ar;
        delete c;

        bosLog.consumedOxygenVolume += dV_O2;
        bosLog.consumedArgonVolume += dV_Ar;
        bosLog.consumedNitrogenVolume += dV_N2;

        // --- SLAG BEHAVIOUR --- //
        bofModel.determineSlagBehaviour();

        // --- FURNACE ROTATION --- //
        bofModel.rotateFurnace(deltaTime);

        bofView.rotateFurnace(bofModel.rotationAngle);

        // Set final mass and composition once, i.e. when the final steel mass hasn't yet been set
        if (bofModel.rotationAngle > bofModel.START_TAP_ANGLE && bosLog.finalSteelMass == 0) {
            // Store final mass and composition prior to casting to facilitate post-mortem
            bosLog.finalSteelMass = bofModel.steel.mass;
            bosLog.finalSteelComposition = bofModel.steel.composition;
        }

        // --- TAPPING --- //
        if (bofModel.rotationAngle == bofModel.TAPPING_ANGLE) {
            if (bofModel.tapping == false) {
                // Store event 'total oxygen volume used'
                var totOxygenVolume = Math.round(bosLog.consumedOxygenVolume);
                bosLog.storeMsg(bofControl.getTime(), gt('total_oxygen_volume') + ": " + totOxygenVolume + " Nm<sup>3</sup>");
                // Store event 'tapping started'
                bosLog.storeMsg(bofControl.getTime(), gt('tapping_start'));
            } else if (bofModel.steel.mass > 0) {
                bofModel.steel.removeMaterial(bofModel.TAPPING_FLOW_RATE * deltaTime);
                innerFurnace.lowerSteel(bofModel.TAPPING_FLOW_RATE * deltaTime);
            } else {
                bofControl.endSimulation("completed");
            }
            bofModel.tapping = true;
        }


        // --------------- REACTIONS ------------------- //
        if (!bofModel.tapping) {
            bofModel.oxidationReactions(dV_O2, deltaTime, dV_Ar, dV_N2);
        }


        // --------------- STORE VALUES ---------------- //
        if (Math.floor(seconds / 60) > Math.floor(bofModel.lastRun / 60)) {
            // Store values in the log
            // Order: Time [s], Temperature [°C], Steel composition [fractions], Slag composition [fractions]
            bosLog.storeValues(seconds, Math.round(bofModel.steel.temperature - 273), bofModel.steel.composition, bofModel.slag.composition);
        }

        // --- CHECK FOR REQUESTED ANALYSIS AND SHOW IF APPROPRIATE --- //
        if (bofModel.analysisPending) {
            if (bofControl.getSecondsTotal() > bofModel.resultsTime) {
                // Display complete analysis
                var array = bofModel.getElementsArray(),
                    comp = bofModel.lastGoodComposition,
                    str = '';
                for (i = 0; i < array.length; i++) {
                    tempCurrent = parseFloat(comp[bofModel.getElementIndex(array[i])] * 100);
                    tempMin = bofModel.steelGrade.minimumComposition.componentArray[bofModel.getElementIndex(array[i])];
                    if (tempMin) {
                        tempMin = parseFloat(tempMin.fraction);
                    } else {
                        tempMin = 0;
                    }
                    tempMax = bofModel.steelGrade.maximumComposition.componentArray[bofModel.getElementIndex(array[i])];
                    if (tempMax) {
                        tempMax = parseFloat(tempMax.fraction);
                    } else {
                        tempMax = 0;
                    }
                    color = (tempCurrent >= tempMin && tempCurrent <= tempMax) ? 'check' : 'times';
                    str += '<tr><td>' + array[i] + (bofModel.getIsReducable(array[i]) ? '*' : '') + '</td>';
                    str += (tempCurrent > 0) ? '<td>' + tempCurrent.toFixed(5) + '</td>' : '<td></td>';
                    str += '<td><span class="fa fa-' + color + '-circle fa-2x"></span></td>';
                    str += (tempMin > 0) ? '<td>' + tempMin.toFixed(4) + '</td>' : '<td></td>';
                    str += (tempMax > 0) ? '<td>' + tempMax.toFixed(4) + '</td></tr>' : '<td></td></tr>';
                }

                $('#complete_analysis_results_body tbody')[0].innerHTML = str;

                bofView.displayCompleteAnalysisResults();


                $('#complete_analysis_results_body tfoot')[0].innerHTML = '<tr class=analysis_results_table_time><td colspan=5>' + gt('analysis_time') + ': ' + bofModel.lastAnalysisTime + '</td></tr>';

                bofModel.analysisPending = false;
                bosLog.storeMsg(bofControl.getTime(), gt('analysis_received'));
            }
        }


        // --- CHECK FOR SOLIDIFICATION OR OVERHEATING --- //
        bofModel.checkSolidification();
        bofModel.checkOverheating();

        // --------------- UPDATE VIEWS ---------------- //
        bofView.displayTemperature(parseInt(bofModel.steel.temperature - 273));
        bofView.displayOxygenVolume(bofModel.accOxygenVolume);

        // Set the current slag foam height to between 0 and MAX_FOAM_HEIGHT.
        oxygenFlowRate = parseFloat($('#oxygen_flow_control').sldr('value'));
        if (oxygenFlowRate > 0) {
            bofView.upperContent.currentFoamHeight = Math.max(0, bofView.upperContent.currentFoamHeight + oxygenFlowRate * bofView.upperContent.rateFoaming / 10);
            if (bofView.upperContent.currentFoamHeight > bofView.upperContent.MAX_FOAM_HEIGHT) {
                bofControl.endSimulation("overflow");
                return;
            }
        } else if (bofModel.rotationAngle == 0) {
            bofView.upperContent.currentFoamHeight = Math.max(0, bofView.upperContent.currentFoamHeight - 1 / 25);
        } else {
            bofView.upperContent.currentFoamHeight = Math.max(0, bofView.upperContent.currentFoamHeight - 0.3);
        }

        // Create bubbles in the foaming slag
        if (bofView.upperContent.currentFoamHeight > 0 && oxygenFlowRate > 0) {
            bofView.upperContent.produceFoamBubbles();
        }

        // Adjust scrap
        if (bofModel.userLevel == 'university_student') {
            scrapPositioning(bofModel.solid.getVolume() * 1.6);
        }

        // Show spitting and returns
        if ((bofView.upperContent.rateReturns > 0 || bofView.upperContent.rateSpitting > 0) && oxygenFlowRate > 0) {
            bofView.upperContent.produceSpits();
            bofView.upperContent.produceReturns();
        }

        bofModel.lastRun = seconds;
    }

    this.analyzeFinalSteelComposition = function() {
        var result = 'fa-check',
            array = this.getElementsArray(),
            comp = (bosLog.finalSteelComposition) ? bosLog.finalSteelComposition : this.steel.composition,
            str = '';

        for (i = 0; i < array.length; i++) {
            tempCurrent = parseFloat(comp[this.getElementIndex(array[i])] * 100);
            color = 'fa-check-circle';
            tempMin = this.steelGrade.minimumComposition.componentArray[this.getElementIndex(array[i])];
            if (tempMin) {
                tempMin = parseFloat(tempMin.fraction);
                color = (tempCurrent >= tempMin) ? 'check' : 'times';
            } else {
                tempMin = 0;
            }
            tempMax = this.steelGrade.maximumComposition.componentArray[this.getElementIndex(array[i])];
            if (tempMax) {
                tempMax = parseFloat(tempMax.fraction);
                color = (tempCurrent <= tempMax) ? 'check' : 'times';
            } else {
                tempMax = 0;
            }
            if (color == 'times') {
                result = 'fa-times-circle';
            }
            str += '<tr><td>' + array[i] + (this.getIsReducable(array[i]) ? '*' : '') + '</td>';
            str += (tempCurrent > 0) ? '<td>' + tempCurrent.toFixed(5) + '</td>' : '<td></td>';
            str += '<td><span class="fa fa-' + color + '-circle fa-2x"></span></td>';
            str += (tempMin > 0) ? '<td>' + tempMin.toFixed(4) + '</td>' : '<td></td>';
            str += (tempMax > 0) ? '<td>' + tempMax.toFixed(4) + '</td></tr>' : '<td></td></tr>';
        }

        document.getElementById("complete_analysis_results_title").innerHTML = gt('final_steel_composition') + " / wt%";
        $('#complete_analysis_results_body tbody')[0].innerHTML = str;
        document.getElementById("complete_analysis_results_button").style.display = "none";
        $(document.getElementById("final_results_steel_img")).addClass(result);
    }

    this.analyzeFinalSlagComposition = function() {
        var array = this.getOxideArray();
        var comp = bosLog.slagCompLog_array[bosLog.slagCompLog_array.length - 1];
        var str = '<thead><tr><th>' + gt('oxide') + ':</th>';
        var strRow2 = '<tbody><tr><th>' + gt('content') + ':</th>';
        for (i = 0; i < array.length; i++) {
            str += '<td>' + array[i] + '</td>';
            strRow2 += '<td>' + parseFloat(comp[this.getCompoundIndex(array[i])]) + '</td>';
        }
        str += '</tr></thead>' + strRow2 + '</tr></tbody>';

        document.getElementById("slag_composition_table").innerHTML = str;
    }

    // Returns the liquidus temperature based on the current steel composition
    this.getLiquidusTemperature = function() {
        var comp = this.steel.composition.concat();
        var liquidusTemperature = 0;

        // Determine liquidus coefficient for elements other than C
        var dT = 0;
        var tempArray = this.steel.getElementArray();
        for (i = 0; i < comp.length; i++) {
            var pct_X = 100 * comp[i];
            var alpha = tempArray[i].liquidusCoefficient;
            dT += (pct_X * alpha);
        }

        // Determine the current liquidus temperature
        var pct_C = comp[this.getElementIndex("C")] * 100;
        if (pct_C < 4.4) {
            if (pct_C < 0.5) {
                liquidusTemperature = 1537 - (73.1 * pct_C) + dT;
            } else if (pct_C >= 0.5) {
                liquidusTemperature = 1531 - (61.5 * pct_C) + dT;
            }
        } else if (pct_C >= 4.4) {
            liquidusTemperature = 389 * pct_C - 10.5 * comp[this.getElementIndex("MN")] * 100
            liquidusTemperature += 105 * comp[this.getElementIndex("SI")] * 100
            liquidusTemperature += 140 * comp[this.getElementIndex("S")] * 100
            liquidusTemperature += 128 * comp[this.getElementIndex("P")] * 100 - 606
        }
        //389 %C - 10.5 %Mn + 105 %Si + 140 %S + 128 %P - 506
        return liquidusTemperature;
    }

    // Determines if the temperature of the liquid steel is below an acceptable level and,
    // if necessary, terminates the simulation
    this.checkSolidification = function() {
        var T_steel = this.steel.temperature - 273;
        var T_liq = this.getLiquidusTemperature();
        //trace("T_steel = "+T_steel+", T_liq = "+T_liq+", dT = "+(T_steel - T_liq));
        // Check that temp hasn't reached liquidus
        if ((T_steel - T_liq) < -MAX_UNDERCOOLING) {
            bofControl.endSimulation("solidification");
        }
    }

    // Determines if the temperature of the liquid steel is above an acceptable level and,
    // if necessary, terminates the simulation
    this.checkOverheating = function() {
        var T_steel = this.steel.temperature - 273;
        // Check that temp hasn't reached liquidus
        if (T_steel > MAX_STEEL_TEMPERATURE) {
            bofControl.endSimulation("overheated");
        }
    }

    this.determineSlagBehaviour = function() {
        // Rate of spitting and foaming (i.e. number of spits per second) is proportional to dV_O2 and the height of the lance
        var str = bofView.lanceModel.checkLancePosition();
        switch (str) {
            case "RETRACTED":
                break;
            case "OPTIMUM":
                bofView.upperContent.rateFoaming = 0;
                bofView.upperContent.rateReturns = 0;
                bofView.upperContent.rateSpitting = 0;
                break;
            case "HIGH":
                // If the lance is higher than the optimum height, Fe is over-oxidized and the rate of C removal
                // is reduced, with a tendency to slopping, i.e. slag pouring over the side of the furnace.
                bofView.upperContent.rateFoaming = 1;
                bofView.upperContent.rateReturns = 0;
                bofView.upperContent.rateSpitting = 0;
                break;
            case "LOW":
                // If it is lower than the optimum height, carbon removal increases and FeO is reduced;
                // slag formation and reactivity are decreased, leading to P removal problems.
                bofView.upperContent.rateFoaming = -0.2;
                bofView.upperContent.rateReturns = .5;
                bofView.upperContent.rateSpitting = 0;
                break;
            case "VERY_LOW":
                // If the lance is much lower than the optimum height, there is a tendency to spitting.
                bofView.upperContent.rateFoaming = -0.4;
                bofView.upperContent.rateReturns = .25;
                bofView.upperContent.rateSpitting = 1;
                break;
            default:
                break;
        }
    }


    /*  Handles oxidation reactions for the steel, scrap and ore emulsion
     *
     *   @param  dV_O2       oxygen volume provided this time increment in m³
     *   @param  dt          time increment in seconds
     *   @param  heatloss    heatloss in MJ per minute
     *   @param  dV_Ar       argon volume provided this time increment in m³
     *   @param  dV_N2       nitrogen volume provided this time increment in m³
     */

    this.oxidationReactions = function(dV_O2, dt, dV_Ar, dV_N2) {
        var C_CONTENT_DIFFUSION = 0.008;
        var MIN_C_CONTENT = 0.0001;
        var SILICON_PARTITION = 0.20;
        var MIN_SI_CONTENT = 0.00005;
        // Partition ratio between iron and silicon oxidation
        var FE_SI_OX_PARTITION = 0.4; // 0.8 kg Fe is oxidised when 1.0 kg Si is oxidised.
        var PCR = 0.1;
        // P oxidation rate necessary for reducing 250 tonnes of steel with %P between 0.08 and 0.015 in 3.5 minutes is 0.025 kmoles/s.
        // Adjusted for maximum oxygen flow rate, 50 Nm³/ s for a 250 tonne charge
        var P_OX_RATE = 0.0025; // Original value: 0.025
        // Mn oxidation rate necessary for reducing 250 tonnes of steel with %Mn between 0.5 and 0.12 in 3.5 minutes is 0.082 kmoles/s.
        // Adjusted for maximum oxygen flow rate, 50 Nm³/ s for a 250 tonne charge
        var MN_OX_RATE = 0.00164; // Original value: 0.082
        // number of moles of O in FeOx, i.e. the x in FeOx
        var x_FEO = 1.15;
        // number of moles of O in COx, i.e. the x in COx
        var x_COx = 1.1;

        var dn_steel = new Object();
        var dn_slag = new Object();
        var dm = new Object();
        // Number of moles divided by 1000 to get kmoles which corresponds to later used unit kg/kmoles.
        var nO = 2 * (101325 * dV_O2) / (GAS_CONSTANT * 273 * 1000);

        // Get liquid steel, slag and gas compositions (in fractions)
        var x_steel = this.steel.composition;
        var x_slag = this.slag.composition;

        // Make arrays for steel and slag composition change and adjust for time increment (dt)
        var steelCompositionChange = new Array();
        var slagCompositionChange = new Array();

        // Cp values are in MJ/(kg*K)
        var Cp = new Object();
        Cp.steel = 0.00082 + 0.00009 * x_steel[this.getElementIndex("C")] * 100;
        Cp.slag = 0.00204;
        // Cp values for gases are in MJ/(Nm³*K)
        Cp.AR = 0.00093;
        Cp.CO = 0.00161;
        Cp.CO2 = 0.00271;
        Cp.N2 = 0.00095;
        Cp.O2 = 0.00168;
        /*
                H (1600°C) - H (25°C)       Cp at 1600°C
                (MJ/kg)     (MJ/m3)     (MJ/K/kg)       (MJ/K/m3)
        O2      1.70        2.43        0.00117         0.00168
        Ar      0.82        1.46        0.00053         0.00093
        N2      1.84        2.30        0.00128         0.00095
        CO      1.86        2.33        0.00128         0.00161
        CO2     1.90        3.78        0.00136         0.00271
        */

        // -------------- STEP 1 - Calculate Sum of Enthalpies of Input Materials ------------//
        // Accumulated heat in:
        // Hot metal
        //trace("steel.getTemperature()="+steel.getTemperature());
        //trace("steel.getMass()="+steel.getMass());

        var deltaH_0 = Cp.steel * (1873 - this.steel.temperature) * this.steel.mass;
        // Burnt lime and dolomite
        deltaH_0 += Cp.slag * (1873 - this.slag.temperature) * this.slag.mass;
        // Heat and dissolution energy (into steel as [O]) for O2
        deltaH_0 += -5.62 * (1.013e5 * dV_O2 * this.getCompoundMolecularMass("O2")) / (GAS_CONSTANT * 1873 * 1000);
        // ----------------------------------------------------------------------------------//

        // --- SILICON OXIDATION --- //
        if (x_steel[this.getElementIndex("Si")] > MIN_SI_CONTENT) {
            // :NOTE: Phase 1 should end after about 3 to 6 minutes. 3 mins for %Si=0.2 and 6 mins for %Si=0.6
            //_root.main_mc.ox_txt.text = "##Phase 1##\tSilicon oxidation";

            // Partion the available oxygen amongst the different reactions
            // Si+O2=SiO2
            dn_steel.SI = -0.5 * nO * SILICON_PARTITION;
            nO += 2 * dn_steel.SI;
            //trace("after SI 1, nO="+nO);
            dn_slag.SIO2 = -dn_steel.SI;

            //Fe+xO=FeOx
            // dn_steel.SI is negative so no minus sign necessary here
            dn_steel.FE = FE_SI_OX_PARTITION * dn_steel.SI;
            nO += dn_steel.FE * x_FEO; // x=1.3 in FEO
            //trace("after SI 2, nO="+nO);
            dn_slag.FEO = -dn_steel.FE;

            // 2P + 5O = P2O5
            dn_steel.P = -P_OX_RATE * dV_O2;
            // Alternative to get a declining behaviour:
            // (P_TARGET-x_steel[Element.P.getIndex()])*dt*steel.getMass()/(Element.P.getMolecularMass()*210);
            nO += (5 / 2) * dn_steel.P
            //trace("after P, nO="+nO);
            dn_slag.P = -0.5 * dn_steel.P;

            // Mn+O=MnO
            dn_steel.MN = -MN_OX_RATE * dV_O2;
            nO += dn_steel.MN;
            dn_slag.MNO = -dn_steel.MN;

            // C+1/2 O2 = CO
            // C+O2 = CO2
            dn_steel.C = -nO / x_COx;
            nO += dn_steel.C * x_COx;

            // Removed
            // dn_gas.CO2 = PCR * dn_steel.C;
            // dn_gas.CO = (1-PCR) * dn_steel.C;
            //if (nO!=0) { trace("ERROR PHASE 1, nO="+nO); }

            // --- CARBON OXIDATION PARTLY DETERMINED BY LANCE POSITION --- //
        } else if (x_steel[this.getElementIndex("Si")] <= MIN_SI_CONTENT && x_steel[this.getElementIndex("C")] > C_CONTENT_DIFFUSION) {
            // :NOTE: Phase 2 ends when %C<0.8 approximately 2/3 into the blow
            //_root.main_mc.ox_txt.text = "##Phase 2##\tCarbon oxidation";

            // Determine the difference in lance tip position relative to optimum position in meters
            var dh = Math.abs(bofView.lanceModel.getLanceTipHeight()) - bofView.lanceModel.OPTIMUM_LANCE_POS;
            //trace("dh= "+dh);
            var heightOffset = (dh - bofView.lanceModel.OPTIMUM_ZONE_HEIGHT / 2);
            //trace("heightOffset= "+heightOffset);
            // Rate at which Fe is oxidised when the lance is too high or low, in kg Fe per m³ O2 per 0.1 m.
            var IRON_OXIDATION_RATE = 0.03;
            // Oxidation rate of iron if the lance height is not optimum.
            var oxidationRate_Fe = heightOffset * (dV_O2 / (IRON_OXIDATION_RATE * 55.847 * 1000)) / 0.1;
            //trace("oxidationRate_Fe = " + oxidationRate_Fe);
            //trace("BEFORE: dn_steel.FE ="+dn_steel.FE+", dn_steel.C ="+dn_steel.C+", nO ="+nO);
            if (heightOffset < 0) {
                // trace("LOW");
                // Oxidation reactions when the lance position is too low
                // If the lance is too low, part of the FeO previously formed is reduced and the oxygen released reacts with C,
                // e.g. 0.03 kg Fe per m³ O2 for dH = 10 cm; this ratio can be increased for higher difficulty level)
                dn_steel.FE = Math.min(nO / x_FEO, -oxidationRate_Fe);
                dn_slag.FEO = -dn_steel.FE;
                nO -= dn_steel.FE * x_FEO;
            } else if (heightOffset > 0) {
                // trace("HIGH");
                // Oxidation reactions when the lance position is too high
                // If the lance is too high, part of the blown oxygen oxidizes Fe, e.g. 0.03 kg Fe per m³ O2 for dH = 10 cm;
                // this ratio can be increased for higher difficulty level
                dn_steel.FE = -Math.min(nO / x_FEO, oxidationRate_Fe);
                dn_slag.FEO = -dn_steel.FE;
                nO -= dn_steel.FE * x_FEO;
            }

            dn_steel.C = -nO / x_COx;
            nO += dn_steel.C * x_COx;
            // trace("AFTER: dn_steel.FE ="+dn_steel.FE+", dn_slag.FEO= "+dn_slag.FEO+", dn_steel.C ="+dn_steel.C+", nO ="+nO);

            //if (nO!=0) { trace("ERROR PHASE 2, nO="+nO); }

            // --- CARBON OXIDATION BY DIFFUSION --- //
        } else if (x_steel[this.getElementIndex("Si")] <= MIN_SI_CONTENT && x_steel[this.getElementIndex("C")] <= C_CONTENT_DIFFUSION && x_steel[this.getElementIndex("C")] > MIN_C_CONTENT) {
            //_root.main_mc.ox_txt.text = "##Phase 3##\tCarbon oxidation by diffusion";

            // [C]+[O] = CO(g)
            // [C]+2[O] = CO2(g)
            dm.C = -dV_O2 / (ALPHA + (BETA / Math.pow(x_steel[this.getElementIndex("C")] * 100, 2)));
            dn_steel.C = dm.C / this.getElementMolecularMass("C");

            nO = 2 * (1.013e5 * dV_O2) / (GAS_CONSTANT * 273 * 1000);
            nO += dn_steel.C * x_COx;

            //Fe+xO=FeOx
            dn_steel.FE = -nO / x_FEO;
            nO += dn_steel.FE * x_FEO;

            dm.FEO = -dn_steel.FE * this.getCompoundMolecularMass("FeO");
            mFeO_tot += dm.FEO;
            dn_slag.FEO = -dn_steel.FE;

            //if (nO!=0) { trace("ERROR PHASE 3, nO="+nO); }

            // --- PURE IRON OXIDATION IF OXYGEN BLOWING CONTINUES FOR TOO LONG --- //
        } else if (x_steel[this.getElementIndex("C")] < MIN_C_CONTENT) {
            //_root.main_mc.ox_txt.text = "##Phase 4##\tPure Iron oxidation (overblow)";

            dn_steel.C = 0;
            dn_steel.FE = -nO / x_FEO;
            nO += dn_steel.FE * x_FEO;

            dm.FEO = -dn_steel.FE * this.getCompoundMolecularMass("FeO");
            mFeO_tot += dm.FEO;
            dn_slag.FEO = -dn_steel.FE;

            //if (nO!=0) { trace("ERROR PHASE 4, nO="+nO); }
        }

        // --- END OF BLOW REACTIONS --- //
        // Only calculate end-of-blow reactions when only stirring is active
        if (dV_Ar > 0 && dV_O2 == 0) {
            // 1) Compute from slag v-ratio and FeO content the value of LP and make the correction for temperature
            var basicity = this.getSlagBasicity();
            // Lp relationship from "BOS Phosporous relationships.xls", based on T_steel = 1650°C
            var Lp = -3.1215 * Math.pow(basicity, 3) + 32.963 * Math.pow(basicity, 2) - 30.532 * basicity;
            //trace("basicity = "+basicity+", Lp = "+Lp);
            // A temperature increase of 50°C leads to a decrease of LP in a ratio of about 1.5
            Lp -= 1.5 * (this.steel.temperature - 1650) / 50;

            // LP = (%P)slag / [%P]steel,eq => [%P]steel,eq = (%P)slag / LP
            var P_steel_eq = (x_slag[this.getCompoundIndex("P")] / Lp);

            // Determine P changes this increment
            /*
                dP/dt = - ß * sqrt(Dp*Q/A)*(A/V)*([P]-[Peq])
            - %P : steel P content at time t
            - %Peq : equilibrium P content at time t
            - b : empirical coefficient (~ 500 m-1/2)
            - Dp : P diffusion coefficient in liquid steel (m2.s-1)
            - Q : volumetric gas flow-rate across the interface (m3.s-1)
            - A : cross section area at the slag-metal interface acier (m2)
            - V : steel volume (m3)
            */
            var Dp = 0.000047; // cm²/s
            dn_steel.P = -500 * Math.sqrt(Dp * dV_Ar / this.INTERNAL_AREA) * (this.INTERNAL_AREA / this.steel.getVolume()) * (x_steel[this.getElementIndex("P")] - P_steel_eq);
            dn_steel.P = Math.min(0, dn_steel.P);
            //trace("dn_steel.P = "+dn_steel.P);
        }
        // LMn = (%Mn)L/[%Mn]A
        // LP = (%P)Slag/[%P]Steel

        // --- ADJUST COMPOSITIONS OF STEEL AND SLAG --- //
        for (var n in dn_steel) {
            var index = this.getElementIndex(n);
            if ((dn_steel[n] + x_steel[index] * this.steel.mass / this.getElementMolecularMass(n)) < 0) {
                dn_steel[n] = -x_steel[index];
            }
            steelCompositionChange[index] = dn_steel[n];
        }
        for (var n in dn_slag) {
            var index = this.getCompoundIndex(n);
            if ((dn_slag[n] + x_slag[index] * this.slag.mass / this.getCompoundMolecularMass(n)) < 0) {
                dn_slag[n] = -x_slag[index];
            }
            slagCompositionChange[index] = dn_slag[n];
        }

        // Calculate oxidation energy
        var dH = new Object();

        if (dm.FEO == undefined) {
            dm.FEO = dn_slag.FEO * this.getCompoundMolecularMass("FeO");
        }
        dm.SIO2 = dn_slag.SIO2 * this.getCompoundMolecularMass("SiO2");
        dm.MNO = dn_slag.MNO * this.getCompoundMolecularMass("MnO");
        dm.P = dn_slag.P * this.getElementMolecularMass("P");
        dm.COx = -dn_steel.C * (this.getElementMolecularMass("C") + this.getElementMolecularMass("O") * x_COx);


        // -------------- STEP 2 - Calculate Enthalpy of Reactions ------------//
        var dH_C_CO = -1.93 - 0.32 * x_steel[this.getElementIndex("C")] * 100;
        var dH_C_CO2 = -15.35 - 0.32 * x_steel[this.getElementIndex("C")] * 100;
        // Enthalpy values for the oxidation reactions (within brackets) are in MJ/kg
        dH.FEO = (-4.06 * 0.3 - 2.49 * 0.7) * dm.FEO;
        dH.MNO = (-5.34) * dm.MNO;
        dH.P = (-23.8) * dm.P;
        dH.SIO2 = (-24.4) * dm.SIO2;
        dH.COx = ((1 - PCR) * dH_C_CO + PCR * dH_C_CO2) * dm.COx;

        var deltaH_2 = 0;
        for (var i in dH) {
            if (!isNaN(dH[i])) {
                deltaH_2 += dH[i];
            }
        }

        // Reduce the energy available with the heat loss of the increment
        var deltaH_loss = this.calcHeatLosses(dt);


        // -------------- STEP 3 Calculate the heat extracted as exhaust gas ---------------------------//
        var EXHAUST_GAS_TEMPERATURE = 1773;
        var gas_dT = EXHAUST_GAS_TEMPERATURE - 1873;
        // CO and CO2 temperature change
        var deltaH_3 = (Cp.CO * gas_dT * (1 - PCR) + Cp.CO2 * gas_dT * PCR) * dn_steel.C * this.getElementMolecularMass("C");

        // N2 and AR temperature change
        deltaH_3 += (0.82 + Cp.AR * gas_dT) * dV_Ar + (1.84 + Cp.N2 * gas_dT) * dV_N2;


        // -------------- STEP 3B Melt scrap incrementally ---------------------------------------------//

        // 1. Determine excess energy --- //
        // Energy available for melting
        var deltaH_1 = deltaH_2 + deltaH_loss + deltaH_3;

        // 2. Determine amount used for scrap melting
        // Roughly 50% but not more than in current solids layer
        var W_available = Math.max(-FRACTION_FOR_MELTING * deltaH_1, 0);
        // Energy used for melting
        var W_used = 0;
        // Incremental mass of melted material, kg
        var dm_melt = 0;
        // Mass in current solids layer, kg
        //var solidsMass = 0;
        if ((this.solid.solidsArray[0]) && (this.solid.solidsArray[0].mass)) {
            var solidsMass = 1000 * this.solid.solidsArray[0].mass;
            // Cp of the currenty solids layer, MJ/kg/K
            var solids_Cp;

            // Energy required to melt current solids layer
            var solidType = this.solid.solidsArray[0].material.id;
            // :TODO:
            // Change value dynamically, currently set to scrap
            // Constants from Table I - "M_H_Balances.doc"
            var W_required = solidsMass * (1.35 - 0.00082 * (1873 - this.steel.temperature));

            // 3. Determine how much solids that can be melted by the available amount of energy
            // Melt the whole layer of solids if there is enough energy
            if (W_available >= W_required) {
                W_used = W_required;
                dm_melt = solidsMass;
                // Melt a mass equivalent to the energy available for melting
            } else if (W_available < W_required) {
                W_used = W_available;
                dm_melt = solidsMass * W_available / W_required;
            }

            // 5. Add same amount into steel or slag
            if (dm_melt > 0) {
                if (solidType == "LS" || solidType == "HS") {
                    // Light or heavy scrap melting
                    this.steel.addMaterial(this.solid.solidsArray[0].material.metalComposition_array, dm_melt)
                } else if (solidType == "IO") {
                    // Iron ore melting and distributing into steel and slag
                    var oxidesComposition = this.solid.solidsArray[0].material.oxideComposition_array.concat();

                    // Calculate amount of Fe in the iron ore and distribute this into the steel phase
                    var m_FeO = dm_melt * oxidesComposition[this.getCompoundIndex("FeO")];
                    var m_Fe = m_FeO * (this.getElementMolecularMass("Fe") / this.getCompoundMolecularMass("FeO"))
                    var elementComposition = new Array(); //steel.getComposition().length
                    elementComposition[0] = 1;
                    this.steel.addMaterial(elementComposition, m_Fe)

                    // Determine the remaining amount of oxide compounds and distribute these into the slag
                    oxidesComposition[this.getCompoundIndex("FeO")] = 0;
                    this.slag.addMaterial(oxidesComposition, (dm_melt - m_FeO));
                } else if (solidType == "LI" || solidType == "DO") {
                    // Lime or dolomite melting and distributing into slag
                    this.slag.addMaterial(this.solid.solidsArray[0].material.oxideComposition_array, dm_melt)
                }
            }

            // 4. Remove molten material from the solids array
            this.solid.solidsArray[0].addMass(-dm_melt / 1000)
        }

        // 5. Use remaining amount of energy to heat charge
        // -------------- STEP 4 Bring steel, slag and gas to their final temperatures -----------------//
        var dT = (deltaH_0 + deltaH_2 + deltaH_loss + W_used + deltaH_3) / (Cp.steel * this.steel.mass + Cp.slag * this.slag.mass);
        //trace("dH0="+deltaH_0+", dH2="+deltaH_2+", dHloss="+deltaH_loss+", dH3="+deltaH_3);//+", "+Cp.steel+", "+steel.getMass()+", "+Cp.slag+", "+slag.getMass());
        if (!isFinite(dT)) {
            dT = 0;
        }

        var new_Temperature = 1873 - dT;
        this.steel.temperature = new_Temperature;
        this.slag.temperature = new_Temperature;
        this.gas.temperature = new_Temperature;

        this.steel.adjustComposition(steelCompositionChange);
        if (this.slag.mass > 0) {
            this.slag.adjustComposition(slagCompositionChange);
        }

        //_root.main_mc.temperature_txt.text = steel.getTemperature()-273;
        //_root.main_mc.iron_txt.text = Math.round(10000*x_steel[Element.FE.getIndex()])/100+"%";

        // Remove current solid phase from array if it is empty (mass = 0)
        if ((this.solid.solidsArray[0]) && (this.solid.solidsArray[0].mass == 0)) {
            //trace(solid.solids_array[0].getMaterial().getName()+" ("+solidType+") molten");
            //trace("slag comp: "+slag.getComposition());
            //trace("slag temp: "+slag.getTemperature());
            //trace("slag mass: "+slag.getMass());
            this.solid.solidsArray.shift();
        }
    }

    // Returns the heat losses incurred in the current time increment in MJ
    this.calcHeatLosses = function(dt) {
        var HLoss = 0;
        // Heat loss is estimated at 4 MJ/min during O2-blowing, 0.5 MJ/min otherwise
        // Static variables declared earlier
        if (dV_O2 > 0) {
            // MJ/min converted to MJ/s and multiplied by number of seconds in time increment (dt).
            HLoss = HEAT_LOSS_BLOWING * dt / 60;
        } else {
            HLoss = HEAT_LOSS_NORMAL * dt / 60;
        }
        return HLoss;
    }

    this.getSlagHeight = function() {
        return (this.slag.mass / (this.slag.density * this.INTERNAL_AREA));
        // return (slag.getVolume()/INTERNAL_AREA);
    }

    // Returns slag basicity as a ratio
    this.getSlagBasicity = function() {
        var fraction_CaO = this.slag.composition[this.getCompoundIndex("CaO")];
        var fraction_SiO2 = this.slag.composition[this.getCompoundIndex("SiO2")];
        if (fraction_SiO2 > 0) {
            return (fraction_CaO / fraction_SiO2);
        } else {
            return 1;
        }
    }

    this.addMaterial = function(c, t) {
        if (c.material.id == "HM") {
            this.steel.addMaterial(c.material.metalComposition_array, c.mass);
            this.steel.temperature = t;
        } else {
            this.solid.addSolids(c, t);
        }
    }

    this.startFurnaceRotation = function() {
        this.rotationVelocity = 1;
    }

    this.rotateFurnace = function(dt) {
        this.rotationAngle += (this.rotationVelocity * dt);
        if (this.rotationVelocity != 0) {
            if (this.rotationAngle < this.UPRIGHT_ANGLE) {
                this.rotationAngle = this.UPRIGHT_ANGLE;
                this.rotationVelocity = 0;
            } else if (this.rotationAngle >= this.TAPPING_ANGLE) {
                this.rotationAngle = this.TAPPING_ANGLE;
                this.rotationVelocity = 0;
            }
        }
    }
}


function Element(s, i, am, rr, lc, ec, ox, re) {
    this.symbol = s;
    this.index = i;
    this.atomicMass = am;
    this.recoveryRate = rr;
    this.liquidusCoefficient = lc;
    this.elementColor = ec;
    this.oxide = ox;
    this.reducable = re;

    this.getMolecularMass = function() {
        return this.atomicMass;
    }
}


function Compound(s, i, mm, nc, na) {
    this.symbol = s;
    this.index = i;
    this.molecularMass = mm;
    this.noCations = nc;
    this.noAnions = na;

    this.getMolecularMass = function() {
        return this.molecularMass;
    }
}


function SteelGrade(sg) {
    // a textual symbol name for the steel grade
    this.shortName = sg;
    // a textual string for the raw material
    this.name;
    // minimum target composition of the metal phase
    this.minimumComposition;
    // maximum target composition of the metal phase
    this.maximumComposition;
    // maximum time to complete the steel grade
    this.maximumTime;
    // minimum tap temperature
    this.minimumTemperature;
    // maximum tap temperature
    this.maximumTemperature;

    switch (this.shortName) {
        case "beam":
            this.name = gt('construction_steel');
            this.minimumComposition = new ChemicalComposition(new ChemicalComponent("Fe", 0));
            this.minimumComposition.addData(new ChemicalComponent("C", 1), 0.001);
            this.maximumComposition = new ChemicalComposition(new ChemicalComponent("Fe", 0));
            this.maximumComposition.addData(new ChemicalComponent("C", 1), 0.0016);
            this.maximumComposition.addData(new ChemicalComponent("Si", 2), 0.0025);
            this.maximumComposition.addData(new ChemicalComponent("Mn", 3), 0.015);
            this.maximumComposition.addData(new ChemicalComponent("P", 4), 0.00025);
            this.maximumComposition.addData(new ChemicalComponent("S", 5), 0.001);
            this.maximumComposition.addData(new ChemicalComponent("Cr", 6), 0.001);
            this.maximumComposition.addData(new ChemicalComponent("B", 12), 0.000005);
            this.maximumComposition.addData(new ChemicalComponent("Cu", 9), 0.0015);
            this.maximumComposition.addData(new ChemicalComponent("Ni", 8), 0.0015);
            this.maximumComposition.addData(new ChemicalComponent("Nb", 20), 0.0005);
            this.maximumComposition.addData(new ChemicalComponent("Ti", 24), 0.0001);
            this.maximumComposition.addData(new ChemicalComponent("V", 25), 0.0001);
            this.maximumComposition.addData(new ChemicalComponent("Mo", 7), 0.0004);
            this.maximumTime = 80;
            this.minimumTemperature = 1630;
            this.maximumTemperature = 1660;
            break;
        case "car":
            this.name = gt('car_steel');
            this.minimumComposition = new ChemicalComposition(new ChemicalComponent("Fe", 0));
            this.maximumComposition = new ChemicalComposition(new ChemicalComponent("Fe", 0));
            this.maximumComposition.addData(new ChemicalComponent("C", 1), 0.0001);
            this.maximumComposition.addData(new ChemicalComponent("Si", 2), 0.0025);
            this.maximumComposition.addData(new ChemicalComponent("Mn", 3), 0.0085);
            this.maximumComposition.addData(new ChemicalComponent("P", 4), 0.00075);
            this.maximumComposition.addData(new ChemicalComponent("S", 5), 0.0005);
            this.maximumComposition.addData(new ChemicalComponent("Cr", 6), 0.0005);
            this.maximumComposition.addData(new ChemicalComponent("B", 12), 0.00005);
            this.maximumComposition.addData(new ChemicalComponent("Cu", 9), 0.0008);
            this.maximumComposition.addData(new ChemicalComponent("Ni", 8), 0.0008);
            this.maximumComposition.addData(new ChemicalComponent("Nb", 20), 0.0003);
            this.maximumComposition.addData(new ChemicalComponent("Ti", 24), 0.00035);
            this.maximumComposition.addData(new ChemicalComponent("Mo", 7), 0.0001);
            this.maximumTime = 80;
            this.minimumTemperature = 1665;
            this.maximumTemperature = 1695;
            break;
        case "pipe":
            this.name = gt('pipe_steel');
            this.minimumComposition = new ChemicalComposition(new ChemicalComponent("Fe", 0));
            this.maximumComposition = new ChemicalComposition(new ChemicalComponent("Fe", 0));
            this.maximumComposition.addData(new ChemicalComponent("C", 1), 0.0008);
            this.maximumComposition.addData(new ChemicalComponent("Si", 2), 0.0023);
            this.maximumComposition.addData(new ChemicalComponent("Mn", 3), 0.011);
            this.maximumComposition.addData(new ChemicalComponent("P", 4), 0.00008);
            this.maximumComposition.addData(new ChemicalComponent("S", 5), 0.0001);
            this.maximumComposition.addData(new ChemicalComponent("Cr", 6), 0.0006);
            this.maximumComposition.addData(new ChemicalComponent("B", 12), 0.00005);
            this.maximumComposition.addData(new ChemicalComponent("Cu", 9), 0.0006);
            this.maximumComposition.addData(new ChemicalComponent("Ni", 8), 0.0005);
            this.maximumComposition.addData(new ChemicalComponent("Nb", 20), 0.00018);
            this.maximumComposition.addData(new ChemicalComponent("Ti", 24), 0.0001);
            this.maximumComposition.addData(new ChemicalComponent("V", 25), 0.0001);
            this.maximumComposition.addData(new ChemicalComponent("Mo", 7), 0.0001);
            this.maximumComposition.addData(new ChemicalComponent("Ca", 13), 0.00005);
            this.maximumTime = 90;
            this.minimumTemperature = 1655;
            this.maximumTemperature = 1685;
            break;
        case "gear":
            this.name = gt('engineering_steel');
            this.minimumComposition = new ChemicalComposition(new ChemicalComponent("Fe", 0));
            this.minimumComposition.addData(new ChemicalComponent("C", 1), 0.003);
            this.maximumComposition = new ChemicalComposition(new ChemicalComponent("Fe", 0));
            this.maximumComposition.addData(new ChemicalComponent("C", 1), 0.0045);
            this.maximumComposition.addData(new ChemicalComponent("Si", 2), 0.004);
            this.maximumComposition.addData(new ChemicalComponent("Mn", 3), 0.009);
            this.maximumComposition.addData(new ChemicalComponent("P", 4), 0.00035);
            this.maximumComposition.addData(new ChemicalComponent("S", 5), 0.0008);
            this.maximumComposition.addData(new ChemicalComponent("Cr", 6), 0.012);
            this.maximumComposition.addData(new ChemicalComponent("B", 12), 0.00005);
            this.maximumComposition.addData(new ChemicalComponent("Cu", 9), 0.0035);
            this.maximumComposition.addData(new ChemicalComponent("Ni", 8), 0.003);
            this.maximumComposition.addData(new ChemicalComponent("V", 25), 0.0001);
            this.maximumComposition.addData(new ChemicalComponent("Mo", 7), 0.003);
            this.maximumTime = 90;
            this.minimumTemperature = 1655;
            this.maximumTemperature = 1685;
            break;
    }
}


function ChemicalComponent(s, i) {
    // Chemical symbol
    this.symbol = s;
    // a number for referencing by array index
    this.index = i;
    // an array to store thermodymamic data for the three states
    this.thermoData = new Array();
}


function ChemicalFraction(cc, fr) {
    this.component = cc;
    this.fraction = fr;
}


function ChemicalComposition(bc) {
    this.componentArray = new Array();
    this.balanceComponent = bc;

    // I can't call method addData yet, this should have same effect for a new CC
    if (bc) {
        this.componentArray.push(new ChemicalFraction(this.balanceComponent, 1.0));
    }

    this.addData = function(cc, fr) {
        var sumFraction = 0;

        // Sum the mass fraction of all components other than balance component in the existing array
        for (i = 1; i < this.componentArray.length; i++) {
            if (this.componentArray[i]) {
                sumFraction += this.componentArray[i].fraction;
            }
        }
        // Add the new fraction to be added
        sumFraction += fr;

        if (sumFraction > 1) // If >1, generate a compile-time error message
        {
            console.log("Adding " + cc.symbol + ": total compositional fraction exceeds 1");
        } else // else OK, so add to exisiting array
        {
            this.componentArray[cc.index] = new ChemicalFraction(cc, fr);
            // Recalculate and set the fraction of the balance component
            this.componentArray[0] = new ChemicalFraction(this.balanceComponent, (1.0 - sumFraction));
        }
    }

    /*
    Returns an array of the element amounts for the composition
    @param  format      1 for mass fraction, 100 for mass percentage
    */
    this.getElementArray = function(format) {
        // Create an array to store fractions of ALL elements
        var elementAmount_array = new Array();

        // Set all compositions to zero
        for (i = 0; i < 28; i++) {
            elementAmount_array[i] = 0;
        }

        // assign the fractions for those elements present
        var m_array = this.componentArray;
        for (i = 0; i < m_array.length; i++) {
            if (m_array[i]) {
                var index = m_array[i].component.index;
                elementAmount_array[index] = format * m_array[i].fraction;
            }
        }
        return elementAmount_array;
    }

    // Creates an array for the oxide composition
    this.getCompoundArray = function(format) {
        // Create an array to store fractions of ALL compounds
        var compoundAmount_array = new Array();

        // Set all compositions to zero
        for (var i = 0; i < 19; i++) {
            compoundAmount_array[i] = 0;
        }

        // assign the percentages for those compounds present
        var o_array = this.componentArray;

        for (i = 0; i < o_array.length; i++) {
            if (o_array[i]) {
                var index = o_array[i].component.index;
                compoundAmount_array[index] = format * o_array[i].fraction;
            }
        }
        return compoundAmount_array;
    }
}


function SolidPhase() {
    this.solidsArray = new Array();

    // Solids temperature, assume 298 °C as initial temperature
    this.temperature = 298;

    this.addSolids = function(sa, t) {
        // Store the old total mass
        var oldMass = this.getTotalMass();

        // Add the solids to the array
        this.solidsArray = this.solidsArray.concat(sa);

        // Get the new total mass
        var newMass = this.getTotalMass();

        // Calculate the new temperature
        this.temperature = (oldMass * this.temperature + (newMass - oldMass) * t) / newMass;
    }

    this.getTotalMass = function() {
        //trace(solids_array[0].getMass());

        var totalMass = 0;
        for (i = 0; i < this.solidsArray.length; i++) {
            totalMass += this.solidsArray[i].mass; // tonnes
        }
        return totalMass;
    }

    this.getVolume = function() {
        var vol = 0;

        for (var i = 0; i < this.solidsArray.length; i++) {
            var solid = this.solidsArray[i];

            vol += solid.mass / solid.material.bulkDensity;
        }

        return vol;
    }

}


function Material(id, n, t, f, bd, uc, mc, oc, mf) {
    this.id = id;
    this.name = n;
    this.type = t;
    this.form = f;
    this.bulkDensity = bd;
    this.unitCost = uc;
    this.metalComposition_array = mc.getElementArray(1);
    this.oxideComposition_array = oc.getCompoundArray(1);
    this.metalFraction = mf;
}


function MaterialAmount(m, n){
    this.material = m;
    this.mass = n;

    this.addMass = function(dm){
        this.mass += dm;
        this.mass = Math.max(0, this.mass);
    }
}


function Phase(n, t, m, d){
    // name of phase
    this.name = n
    // composition of phase
    this.composition = new Array();
    // temperature of phase, K
    this.temperature = t;
    // mass of phase, kg
    this.mass = m;
    // density, kg/m³
    this.density = d;

    var length = 0;

    // Check if the phase is a metal phase:
    if (this.name == "Steel") {
        // Initialize a composition array based on elements
        length = 28;            //Element.element_array.length
    } else if ( (this.name=="Slag") || (this.name=="Gas") ) {
        // Otherwise initialize a composition array based on compounds
        length = 19;                //Compound.compound_array.length
    }

    // Initialize all the metal composition array elements to zero
    for (i=0; i<length; i++)
    {
        this.composition[i] = 0;
    }

    this.addMaterial = function(additionComposition, m){
        var oldComposition = new Array();
        oldComposition = this.composition;
        var newMass = this.mass + m;

        // Make sure newMass > 0 otherwise there will be division by 0
        // As long as newMass is 0, no calculation is needed anyway
        if (newMass > 0) {
            var f_array = new Array();
            var f_sum = 0;
            for (i=0; i<this.composition.length; i++) {
                // Variation of mass fraction of the current chemical component to allow scattered compositions
                // ±5% variation, i.e. 0.95 - 1.05 of passed value
                var variation = 0.95 + 0.1*Math.random();
                if (additionComposition[i]==undefined){
                    additionComposition[i]=0;
                }
                f_array[i] = variation * additionComposition[i];
                f_sum += f_array[i];
            }
            // The sum of the fractions can be validly 0 if it is the first addition to the phase,
            // hence give f_sum the value of 1 in that case to avoid NaN in the composition array
            if (f_sum==0){
                f_sum=1;
            }
            for (i=0; i<this.composition.length; i++) {
                // Adjust f_array before calculating the new composition to adjust for the sum of the variation
                // in composition, resulting in that the sum of fractions is 1
                this.composition[i] = (oldComposition[i]*this.mass + (f_array[i]*m)/f_sum ) / newMass;
            }
        } else {
            newMass = 0;
        }

        // Store current mass
        this.mass = newMass;
    }

    /*
        Adjusts the composition of the phase.
        Accepts an array of the composition change in moles
        and a non-compulsory string for describing where its being called from

        @param  dn  array of changes in kmoles
        @param  str string (non-compulsory) that identifies caller
    */
    this.adjustComposition = function(dn, str) {
        // Take a snapshot of composition and total mass so that it doesn't change during calculations
        // wf = weight fraction
        var wf_old = this.composition.concat();

        // Snapshot of old mass in kg
        var m_tot_old = this.mass;
        // An array for the new number of moles of the components
        var n_old = new Array();

        // Determine and retrieve the components array for the relevant type of phase
        if (this.name == "Steel") {
            var components = this.getElementArray();
            //trace("Phase "+name+"; n [S]="+composition[Element.S.getIndex()]*m_tot_old/Element.S.getMolecularMass());
            //trace("Phase "+name+"; n [P]="+composition[Element.P.getIndex()]*m_tot_old/Element.P.getMolecularMass());
            //trace("Phase "+name+"; n (Al)="+(composition[Element.AL.getIndex()]*m_tot_old/Element.AL.getMolecularMass())+", dn_AL = "+dn[Element.AL.getIndex()]);
        } else if (this.name == "Slag") {
            var components = this.getCompoundArray();
            //trace("Phase "+name+"; n (P)="+composition[Compound.P.getIndex()]*m_tot_old/Compound.P.getMolecularMass());
        }

        var dm_tot = 0;
        // Determine the new number of moles and the change in total mass, dm_tot

        for (i=0; i<wf_old.length; i++) {
            // Nullify undefined positions
            if (dn[i] == undefined){
                dn[i] = 0;
            }
            n_old[i] = wf_old[i]*m_tot_old/components[i].getMolecularMass();
            dm_tot += dn[i]*components[i].getMolecularMass();
        }

        // An array for the new composition in weight fraction
        var wf_new = new Array();
        var comp_tot = 0;
        // Determine and assign the new composition
        for (i=0; i<wf_old.length; i++) {
            wf_new[i] = ( (dn[i] + n_old[i])*components[i].getMolecularMass())/( m_tot_old+dm_tot );
            comp_tot += wf_new[i];
            if (wf_new[i]<0) {
                console.log("## "+name+" phase component "+components[i].symbol+" content is less than 0, wt%="+(wf_new[i]));
            }
            //trace("f["+components[i].getSymbol()+"]="+wf_new[i]);
        }

        // Assign the new composition
        this.composition = wf_new;

        // Store new mass in kg
        this.mass = m_tot_old+dm_tot;
    }

    this.getElementArray = function(){
        var elementArray = new Array();
        elementArray.push(new Element("Fe", 0, 55.847, 100, 0, 0x000000, "FEO", false));
        elementArray.push(new Element("C", 1, 12.0107, 95, 0, 0x000000, "CO", true));
        elementArray.push(new Element("Si", 2, 28.0855, 98, -14.0, 0x6B6BEFE, "SIO2", true));
        elementArray.push(new Element("Mn", 3, 54.938, 95, -4.0, 0x0099CC, "MNO", true));
        elementArray.push(new Element("P", 4, 30.974, 98, -30.0, 0x000066, "", false));
        elementArray.push(new Element("S", 5, 32.066, 80, -45.0, 0xFFFF00, "", true));
        elementArray.push(new Element("Cr", 6, 51.966, 99, -1.5, 0x0BB57D, "CR2O3", false));
        elementArray.push(new Element("Mo", 7, 95.94, 100, -5.0, 0xC082C1, "MOO3", false));
        elementArray.push(new Element("Ni", 8, 58.6934, 100, -3.5, 0x3C7B84, "", false));
        elementArray.push(new Element("Al", 9, 26.9815, 90, -2.5, 0xA2A2C1, "AL2O3", true));
        elementArray.push(new Element("Ar", 10, 39.948, 100, 0, 0x000000, "", false));
        elementArray.push(new Element("As", 11, 74.92, 100, 0, 0xB7B78C, "", false));
        elementArray.push(new Element("B", 12, 10.811, 100, 0, 0x996666, "", false));
        elementArray.push(new Element("Ca", 13, 40.078, 15, 0, 0x258F25, "CAO", false));
        elementArray.push(new Element("Ce", 14, 140.116, 100, 0, 0x000000, "", false));
        elementArray.push(new Element("Co", 15, 58.933, 100, 0, 0x000000, "", false));
        elementArray.push(new Element("Cu", 16, 63.546, 100, 0, 0xE69D68, "", false));
        elementArray.push(new Element("H", 17, 1.0079, 100, 0, 0xFFFFFF, "", true));
        elementArray.push(new Element("Mg", 18, 24.305, 100, 0, 0x000000, "MGO", false));
        elementArray.push(new Element("N", 19, 14.00674, 40, 0, 0x00FF00, "", true));
        elementArray.push(new Element("Nb", 20, 92.906, 100, 0, 0x9FC4A0, "", false));
        elementArray.push(new Element("O", 21, 15.9994, 100, 0, 0xFF0000, "", true));
        elementArray.push(new Element("Pb", 22, 207.2, 100, 0, 0x000000, "PBO", false));
        elementArray.push(new Element("Sn", 23, 118.71, 100, 0, 0xDCDC87, "", false));
        elementArray.push(new Element("Ti", 24, 47.867, 90, 0, 0xFF00FF, "TIO2", false));
        elementArray.push(new Element("V", 25, 50.9415, 100, -4.0, 0xC67D95, "V2O5", false));
        elementArray.push(new Element("W", 26, 183.84, 100, 0, 0x000000, "", false));
        elementArray.push(new Element("Zn", 27, 65.39, 100, 0, 0x000000, "", false));

        return elementArray;
    }

    this.getCompoundArray = function(){
        var compoundArray = new Array();
        compoundArray.push(new Compound("Al2O3", 0, 101.9612, 2, 3));
        compoundArray.push(new Compound("CaF2", 1, 78.0748, 1, 2));
        compoundArray.push(new Compound("CaO", 2, 56.0774, 1, 1));
        compoundArray.push(new Compound("CO", 3, 28.0101, 1, 1));
        compoundArray.push(new Compound("Cr2O3", 4, 151.9302, 2, 3));
        compoundArray.push(new Compound("FeO", 5, 71.8464, 1, 1));
        compoundArray.push(new Compound("H2", 6, 2.0158, 0, 0));
        compoundArray.push(new Compound("H2O", 7, 18.0152, 2, 1));
        compoundArray.push(new Compound("MgO", 8, 40.3044, 1, 1));
        compoundArray.push(new Compound("MnO", 9, 70.9374, 1, 1));
        compoundArray.push(new Compound("MoO3", 10, 143.9382, 1, 3));
        compoundArray.push(new Compound("N2", 11, 28.01348, 0, 0));
        compoundArray.push(new Compound("O2", 12, 31.9988, 0, 0));
        compoundArray.push(new Compound("PbO", 13, 223.1994, 1, 1));
        compoundArray.push(new Compound("SiO2", 14, 60.0843, 1, 2));
        compoundArray.push(new Compound("TiO2", 15, 79.8658, 1, 2));
        compoundArray.push(new Compound("V2O5", 16, 181.88, 2, 5));
        compoundArray.push(new Compound("(P)", 17, 30.974, 0, 0));
        compoundArray.push(new Compound("(S)", 18, 32.065, 0, 0));

        return compoundArray;
    }

    this.getVolume = function(){
        return this.mass/this.density;
    }

    // Removes m kg of material from the phase
    this.removeMaterial = function(m){
        this.mass -= m;
        this.mass = Math.max(this.mass, 0);
    }
}


function LanceModel(){
    //LANCE CONSTANTS
    this.MAX_ALLOWED_HEATING = 60   // Mximum time in seconds the lance can be submerged in the steel
    this.SPEED = 5.5;           // speed of inserting/retracting,  in pixels/seconds   // 5 in Flash
    this.LANCE_TOP_POS = -414;      // px
    this.FURNACE_TOP_POS = -382;    // px   // -380 in Flash
    this.FURNACE_BOTTOM_POS = -148; // px   //  -174 in Flash

    // Optimum lance position for not causing slopping or spitting, i.e. too low or too high position
    // Optimum lance position is about 220 cm above the bottom of the furnace
    this.OPTIMUM_LANCE_POS = 2.2; // meters
    // Height of allowable optimum zone for lance, i.e. 0.4 m means ± 0.2 meters
    // :NOTE: This should be changeable according to User Level
    this.OPTIMUM_ZONE_HEIGHT = 0.4; // meters

    this.lance = document.getElementById("oxygen_lance_container");
    this.lanceMove = -1;
    this.streamCnv = document.getElementById('oxygen_stream_canvas');
    this.streamCtx = this.streamCnv.getContext("2d");
    this.streamAnimation = -1;
    this.streamHeight = 0;
    this.streamImage = document.getElementById("oxygen_stream_pattern");
    this.sublanceMove = -1;
    this.sublanceIdle = -1;
    this.analysisTimer = 0;
    this.lanceHeating = 0;

    $lancePositionIcon = $(document.getElementById("lance_position_icon"));

    this.checkLanceSubmerged = function(dt){
        if(this.checkLancePosition()=="SUBMERGED"){
            this.lanceHeating += dt;
            this.lanceHeating = Math.min(this.lanceHeating, this.MAX_ALLOWED_HEATING);
        }
        else{
            this.lanceHeating -= dt;
            this.lanceHeating = Math.max(this.lanceHeating, 0);
        }
        if(this.lanceHeating>0){
            if(this.lanceHeating==this.MAX_ALLOWED_HEATING){
                bofControl.endSimulation("lance_failure");
            }
            else{
                var tip = document.getElementById("oxygen_lance_tip");
                var depth = Math.abs(this.getLanceTipHeight() * bofView.SCALE_FACTOR_PX_M) + this.lanceHeating/3;

                $(tip).css('height', depth);
            }
        }
    }

    this.getLanceTipHeight = function(){
        return Math.abs((this.lance.offsetTop-this.FURNACE_BOTTOM_POS)/bofView.SCALE_FACTOR_PX_M) - innerFurnace.getSteelLevelM();
    }

    this.lanceDown = function(){
        if(this.lanceMove == -1){
            this.lanceMove = setInterval(this.lanceMovingDown, 100);
        }
    }

    this.lanceMovingDown = function(){
        if(bofView.lanceModel.lance.offsetTop < bofView.lanceModel.FURNACE_BOTTOM_POS){  //Check lance doesn't go beyond tank bottom  - 220 for full size
            lanceSpeed = Math.round(parseInt(bofControl.simulationRate) / 3);
            lanceSpeed = Math.max(lanceSpeed, 1);

            $(bofView.lanceModel.lance).css('top', bofView.lanceModel.lance.offsetTop + lanceSpeed);
        }
        else{
            $(bofView.lanceModel.lance).css('top', bofView.lanceModel.FURNACE_BOTTOM_POS);
            bofView.lanceModel.lanceStop();
        }

        //Display Lance position in marker
        if(bofView.lanceModel.lance.offsetTop < bofView.lanceModel.FURNACE_TOP_POS){
            bofView.lanceModel.blankLancePosition();
        }
        else{
            bofView.lanceModel.displayLancePosition();
        }

        bofView.upperContent.recalculatePoints(bofView.lanceModel.getLanceTipHeight(),
            parseFloat($('#oxygen_flow_control').sldr('value')));

        bofView.lanceModel.checkOxygenFlow(bofView.lanceModel.lance.offsetTop, $('#oxygen_flow_control').sldr('value'));
    }

    this.lanceUp = function(){
        if(this.lanceMove == -1){
            this.lanceMove = setInterval(this.lanceMovingUp, 100);
        }
    }

    this.lanceMovingUp = function(){
        if(bofView.lanceModel.lance.offsetTop > bofView.lanceModel.LANCE_TOP_POS){  //Check lance doesn't go beyond original position  - 600 for full size
            lanceSpeed = Math.round(parseInt(bofControl.simulationRate) / 3);
            lanceSpeed = Math.max(lanceSpeed, 1);
            $(bofView.lanceModel.lance).css('top', bofView.lanceModel.lance.offsetTop - lanceSpeed);
        }
        else{
            $(bofView.lanceModel.lance).css('top', bofView.lanceModel.LANCE_TOP_POS);
            bofView.lanceModel.lanceStop();
        }

        //Display Lance position in marker
        if(bofView.lanceModel.lance.offsetTop < bofView.lanceModel.FURNACE_TOP_POS){
            bofView.lanceModel.blankLancePosition();
        }
        else{
            bofView.lanceModel.displayLancePosition();
        }

        bofView.upperContent.recalculatePoints(bofView.lanceModel.getLanceTipHeight(),
            parseFloat($('#oxygen_flow_control').sldr('value')));

        bofView.lanceModel.checkOxygenFlow(bofView.lanceModel.lance.offsetTop, $('#oxygen_flow_control').sldr('value'));
    }

    this.lanceRetract = function(){
        if(this.lanceMove == -1){
            this.lanceMove = setInterval(this.lanceMovingUp, 100);
        }
    }

    this.lanceStop = function(){
        if(this.lanceMove != -1){
            clearInterval(this.lanceMove);
            this.lanceMove = -1;
        }
    }

    this.isLanceRetracted = function(){
        if(bofView.lanceModel.lance.offsetTop <= bofView.lanceModel.LANCE_TOP_POS){
            return true;
        }
        else{
            return false;
        }
    }

    this.checkLancePosition = function(){
        if(this.isLanceRetracted()){
            return "RETRACTED";
        }
        var h = this.getLanceTipHeight();
        var returnString = "";
        if (h < 0) {
            returnString = "SUBMERGED";
        } else if (h < (this.OPTIMUM_LANCE_POS+this.OPTIMUM_ZONE_HEIGHT/2) && h > (this.OPTIMUM_LANCE_POS-this.OPTIMUM_ZONE_HEIGHT/2)) {
            returnString = "OPTIMUM";
        } else if (h > (this.OPTIMUM_LANCE_POS+this.OPTIMUM_ZONE_HEIGHT/2)) {
            returnString = "HIGH";
        } else if (h < (this.OPTIMUM_LANCE_POS-3*this.OPTIMUM_ZONE_HEIGHT/2)) {
            returnString = "VERY_LOW";
        } else if (h < (this.OPTIMUM_LANCE_POS-this.OPTIMUM_ZONE_HEIGHT/2)) {
            returnString = "LOW";
        }
        //trace(returnString+", h= "+h+", "+(OPTIMUM_LANCE_POS+OPTIMUM_ZONE_HEIGHT/2)+",
        //"+(OPTIMUM_LANCE_POS-OPTIMUM_ZONE_HEIGHT/2)+", "+(OPTIMUM_LANCE_POS-3*OPTIMUM_ZONE_HEIGHT/2));
        return returnString;
    }


    this.blankLancePosition = function(){
        document.getElementById("lance_position_label").innerHTML = "";
        $lancePositionIcon.removeClass('fa-caret-up fa-caret-down fa-circle green yellow red fa-2x fa-3x');
    }

    this.displayLancePosition = function(){
        var val = this.getLanceTipHeight();
        var tip = document.getElementById("oxygen_lance_tip");
        tip.className="";
        document.getElementById("lance_position_label").innerHTML = parseFloat(val).toFixed(2) + " m";
        var str = this.checkLancePosition();
        switch (str) {
            case "OPTIMUM":
                $lancePositionIcon.removeClass('fa-caret-up fa-caret-down fa-circle yellow red fa-3x')
                    .addClass('fa-2x fa-circle green');
                break;
            case "HIGH":
                $lancePositionIcon.removeClass('fa-caret-up fa-caret-down fa-circle green red fa-2x')
                    .addClass('fa-3x fa-caret-up yellow');
                break;
            case "LOW":
                $lancePositionIcon.removeClass('fa-caret-up fa-caret-down fa-circle green red fa-2x')
                    .addClass('fa-3x fa-caret-down yellow');
                break;
            case "VERY_LOW":
                $lancePositionIcon.removeClass('fa-caret-up fa-caret-down fa-circle green yellow fa-2x')
                    .addClass('fa-3x fa-caret-down red');
                break;
            case "SUBMERGED":
                $lancePositionIcon.removeClass('fa-caret-up fa-caret-down fa-circle green yellow fa-3x')
                    .addClass('fa-2x fa-circle red');
                tip.className="submerged";
                break;
        }
    }

    this.oxygenFlowChange = function(val){
        var range = $('#oxygen_flow_control');
        if(val>0 && val <=0.25)
            range.sldr('value', 0);
        if(val>0.25 && val <0.5)
            range.sldr('value', 0.5);

        // this.showOxygenFlowRateRangeValue(range.sldr('value'));
        this.displayOxygenStream(range.sldr('value'));

        bofView.upperContent.recalculatePoints(this.getLanceTipHeight(), parseFloat(range.sldr('value')));
    }

    this.checkOxygenFlow = function(lancePosition, streamFlow){
        var flowControl = $('#oxygen_flow_control');
        if(lancePosition <= bofView.lanceModel.FURNACE_TOP_POS){   //530 for fulll size
            flowControl.sldr('disable');
            if(flowControl.sldr('value') > 0){
                flowControl.sldr('value', 0);
            }
        }
        else{
            flowControl.sldr('enable');
            this.displayOxygenStream(streamFlow);
        }
    }

    this.displayOxygenStream = function(value){
        value = +value;
        var height = value * 30,
            width,
            temp = Math.abs(this.lance.offsetTop) + this.FURNACE_BOTTOM_POS - bofModel.steelLevel - bofView.upperContent.upperContentLevel - 6;

        if(temp < height){
            height = temp;
            if(height < 0){
                height = 0;
            }
        }

        width = height/3;

        this.streamCtx.clearRect(0,0,60,90);
        this.streamCtx.beginPath();

        this.streamCtx.moveTo(this.streamCtx.canvas.width/2-2,0);
        this.streamCtx.lineTo(this.streamCtx.canvas.width/2+2,0);
        this.streamCtx.lineTo(this.streamCtx.canvas.width/2+width, height);
        this.streamCtx.lineTo(this.streamCtx.canvas.width/2+value, height);
        this.streamCtx.lineTo(this.streamCtx.canvas.width/2,2);
        this.streamCtx.lineTo(this.streamCtx.canvas.width/2-value, height);
        this.streamCtx.lineTo(this.streamCtx.canvas.width/2-width, height);
        this.streamCtx.lineTo(this.streamCtx.canvas.width/2-2,0);

        this.streamCtx.closePath();


        if(this.streamAnimation == -1){
            this.streamAnimation = setInterval(this.animateStream, 300);
        }
    }

    this.animateStream = function(){
        if(bofView.lanceModel.streamImage.id == "oxygen_stream_pattern"){
            bofView.lanceModel.streamImage = document.getElementById("oxygen_stream_pattern_alt");
        }
        else{
            bofView.lanceModel.streamImage = document.getElementById("oxygen_stream_pattern");
        }
        var pattern = bofView.lanceModel.streamCtx.createPattern(bofView.lanceModel.streamImage, 'repeat');
        bofView.lanceModel.streamCtx.fillStyle = pattern;

        bofView.lanceModel.streamCtx.fill();
    }

    this.takeSample = function(){
        if (bofModel.analysisPending) {
            bofView.displayUserMessage(gt('analysis_pending'), gt('analysis_pending_msg'));
        } else if (parseFloat($('#oxygen_flow_control').sldr('value')) > bofModel.MAX_OX_RATE_FOR_ANALYSIS) {
            bofView.displayUserMessage(gt('oxygen_high'), gt('oxygen_high_msg') + '<br>' + gt('oxygen_high_msg1') + ': ' +
                bofModel.MAX_OX_RATE_FOR_ANALYSIS.toFixed(2) + " Nm<sup>3</sup>/min/t");
        } else {
            // Lower simulation rate to 1
            $('#simulation_rate_control').sldr('value', 1);
            bosLog.storeMsg(bofControl.getTime(), gt('analysis_requested'));
            bosLog.addCost("analysis");
            //start sampling animation
            if(this.sublanceMove == -1){
                this.sublanceMove = setInterval(this.sublanceMovingDown, 70);
            }
        }
    }

    this.sublanceMovingDown = function(){
        var sublance = document.getElementById('sublance');
        if(sublance.offsetTop<-123){
            $(sublance).css('top', sublance.offsetTop + 5);
        }
        else{
            clearInterval(bofView.lanceModel.sublanceMove);
            bofView.lanceModel.sublanceMove = -1;
            if(bofView.lanceModel.sublanceIdle == -1){
                bofView.lanceModel.sublanceIdle = setInterval(bofView.lanceModel.sublanceSampling, 1000);
            }
            bofModel.makeAnalysis();
            bofView.lanceModel.analysisTimer = 0;
        }
    }

    this.sublanceMovingUp = function(){
        var sublance = document.getElementById('sublance')
        if(sublance.offsetTop>-443){
            $(sublance).css('top', sublance.offsetTop - 5);
        }
        else{
            clearInterval(bofView.lanceModel.sublanceMove);
            bofView.lanceModel.sublanceMove = -1;
        }
    }

    this.sublanceSampling = function(){
        if(bofControl.getSecondsTotal() - bofModel.requestTime > 2){
            clearInterval(bofView.lanceModel.sublanceIdle);
            bofView.lanceModel.sublanceIdle = -1;
            if(bofView.lanceModel.sublanceMove == -1){
                bofView.lanceModel.sublanceMove = setInterval(bofView.lanceModel.sublanceMovingUp, 70);
            }
        }
    }
}
