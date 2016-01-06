/*****************************************************************
 * Developed by Joe Pruskowski for an ASU graduate project on the
 * impact of data visualization. Copyright 2015-2016 all rights
 * reserved.
 *****************************************************************/

/* jshint jquery: true, forin: false */
/* globals states, Chart */

var _tl = {};
var views = [];
/*
 */
$(document).ready(function() {
	"use strict";
	
	_tl.setup.setupVars({
		nBuckets: 5,
		limitYears: 12,
		selectedPalette: 0,
		limitLowValue: 6,
		limitHighValue: 30,
		currentState: "AL",
		topRating: 100
	});
	/*
	 * Find all of the data views and put them in a list.
	 */
	$("[data-view-type]").each(function(index, element) {
		views.push({type: $(element).data("view-type"), element: element, obj:null});
	});
	/*
	 * Toggle showing the mobile menu when the icon is clicked.
	 */
	$("div#mobile-menu-icon").click(function() {
		if ($("nav").css("display") == "none") {
			$("nav").css("display","block");
		} else {
			$("nav").css("display","");
		}
	});
	/*
	 * Setup mobile state selector.
	 */
	if($("div#mobileStateSelector").length) {
		setupMobileSelector();
	}
	$("div#dialogHelp").dialog({
		modal: true,
		autoOpen: false,
		resizable: false,
		width: "90%",
		minHeight: 400, 
		buttons: {
			Ok: function() {
					$(this).dialog("close");
				}
		},
		open: function(event, ui) {
			var helpFile = $('div#dialogHelp').data("help-file");
			if(!helpFile) helpFile = "help.html";
			$('div#dialogHelp').load('help/' + helpFile);
		},
		close: function(event, ui) {
			$('li#help a').blur();
		},
	});
	$("div#personInfo").dialog({
		modal: true,
		autoOpen: false,
		resizable: false,
		minHeight: 400, 
		show: {
        	effect: "fade",
        	duration: 500
		},
      	hide: {
       	 effect: "fade",
       	 duration: 500
      	},
		width: "90%",
		buttons: {
			Ok: function() {
					$(this).dialog("close");
				}
		},
		open: function(event, ui) {
			var html = _tl.InfoCard.buildHTML($(this).data("state"), $(this).data("person"));
			$(this).html(html);
		},
		close: function(event, ui) {
			$('li#help a').blur();
		},
	});
	/*
	 * Open the help dialog when requested. The help file to open is based
	 * on the page name. Either the menu link or an image with the "help" class
	 * will both open the help dialog.
	 */
	$("li#help").click(function() {
		$("div#dialogHelp").dialog("open");   
	});
	$("img.help").click(function() {
		$("div#dialogHelp").dialog("open");    
	});
	/*
	 * When unloaded, save off the current state in the cookie.
	 */
	$(window).on('beforeunload', function () {
		document.cookie = "_termLimits_limit=" + _tl.limitYears + 
			",_termLimits_palette=" + _tl.selectedPalette + 
			",_termLimits_state=" + _tl.currentState;
	});
	/*
	 * If there are data views, calculate the term information.
	 */
	if(views.length > 0) calculateInfo(states);
	/*
	 * Setup for options processing.
 	 */
 	createOptionsDialog();
	/*
	 * Setup slider if needed.
	 */
	setupSlider();
	/*
	 * Initialize any views with the appropriate startup logic.
	 */
	initViews(views);
	/*
	 * When window is resized, resize the tables, etc.
	 */
	$(window).resize(windowResize);
	windowResize();
});

function windowResize() {
	"use strict";
	/*
	 * Resize the map overlay when visible. This is needed because the overlay used to
	 * shield the map from clicking in mobile view must be explicitly resized because
	 * it is positioned absolutely so it can overlay the map.
	 */
	if($("div#mapWrapper div:first-child").is(":visible")) {
		$("div#mapWrapper div:first-child").width($("div#mapWrapper div#vmap").width());
		$("div#mapWrapper div:first-child").height($("div#mapWrapper div#vmap").height());
	}
	/*
	 * Setup a table if present. Anything that has the class tableWrapper will be formatted.
	 * Note that the first tr in the table header must have a colspan attribute which
	 * spans the number of data columns in the table.
	 */
	if($('.tableWrapper').length) {
		var w = document.getElementsByClassName('tableWrapper')[0].clientWidth;
		var count = $('.tableWrapper table thead tr:first-of-type th').attr('colspan');
		$('.tableWrapper td, .tableWrapper th').width(w/count);
		$('td').width(w/count);
		$('tbody').css('top', $('thead').height());
		if($('div#mapWrapper').length) {
			$('tbody').css("max-height", $('div#mapWrapper').outerHeight() + $('fieldset').outerHeight() -
				$('thead').outerHeight());
		} else {
			$('tbody').css("max-height", $(window).height() -  $('footer').outerHeight(true) - $('tbody').offset().top);
		}
		/*
		 * Add 2 for roundoff...
		 */
		$('.tableWrapper').height($('thead').height()+$('tbody').height()+2);
	}
}	

function initViews(views) {
	"use strict";
	/*
	 * Initialize views. Note that the map has 2 click handlers: one which occurs on the
	 * map overlay div when in mobile view and the other directly on a specific state
	 * when the map is not in mobile view.
	 */
	for (var i = 0; i < views.length; i++) {
		switch (views[i].type) {
			case "tableTotal":
				fillTable(views[i], "");
				colorTable(views[i]);
				break;
			case "tableSingle":
				fillTable(views[i], _tl.currentState);
				colorTable(views[i]);
				break;
			case "map":
				setupMobileClick(views[i]);
				$(views[i].element).usmap({
					'click' : handleMapClick
				});
				$(views[i].element).width('100%').height('100%');
				$(views[i].element).find("svg").attr("width", "100%").attr("height", "100%");
				colorMap(views[i]);
				break;
			case "chartState":
				initChart(views[i], 5);
				fillChart(views[i]);
				break;
			case "tableChartState":
				/*
				 * Fill the chart table - this assumes that the chart precedes the
				 * table in HTML and is processed prior to this call.
				 */
				fillChartTable(views[i]);
				break;
		}
	}
}

function setupMobileClick(view) {
	"use strict";
	/*
	 * Setup to handle a click on the map if we're providing a mobile view. Note that the
	 * view can either be on a touch or non-touch device, each of which is handled 
	 * differently. Note that state selection on a touch device will always happen
	 * from a select menu.
	 */
	 if(_tl.touchDevice) {
	 	$("div#mapWrapper div:first-child").show();
	 	$("div#mapWrapper div:first-child").hover(function(e){
			e.preventDefault();
			$(this).trigger("click");
		});
	 }
	 $("div#mapWrapper div:first-child").click(function(event, data) {
	 	handleMapClick(event, data);
	 });
}

function fillChartTable(tableView) {
	"use strict";
	var chartView;
	var i;
	/*
	 * Find the associated chart.
	 */
	for(i = 0; i < views.length; i++) {
		if(views[i].type == "chartState") {
			chartView = views[i];
			break;
		}
	}
	var bars = chartView.obj.datasets[0].bars;
	var $tb = $(tableView.element).find("tbody");
	var html = "";
	for(i = 0; i < bars.length; i++) {
		html += '<tr style="background-color:' + bars[i].fillColor + 
		';color:' + bars[i].strokeColor + '"><td>' + 
		bars[i].label + "</td><td>" + bars[i].value + "</td></tr>";
	}
	$tb.html(html);
	windowResize();
}

function handleMapClick(event, data) {
	"use strict";
	/*
 	 * Handle a map click event from either the map container (ie, user clicked outside of a
	 * state boundary) or directly from the map SVG.
	 */
	if(data === undefined) {
		$("div#mobileStateSelector").dialog("open");
		return;
	}
	_tl.currentState = $(data).attr("name");
	for (var i = 0; i < views.length; i++) {
		if(views[i].type == "tableSingle") {
			showMapTable(views[1], _tl.currentState);
			break;
		}
	}
	windowResize();
}

function calculateInfo(states) {
	"use strict";
	/*
 	 * Calculate the term information for each state.
  	 */
	for (var state in states) {
		/*
		 * Provide a quantity of allowed days based on a requested term limit for each slot (either a senator
		 * or representative - treat both as having the same limit).
		 */
		states[state].nAllowedDays = (states[state].nSen + states[state].nRep) * _tl.limitDays;
		states[state].nOverDays = 0;
		/*
		 * Scan the legislators and for each legislator, add into the nOverDays bucket the number of days that
		 * they are over the limit.
		 */
		for (var i=0; i < states[state].legislators.length; i++) {
			if(states[state].legislators[i].nDays > _tl.limitDays) {
				states[state].nOverDays += (states[state].legislators[i].nDays - _tl.limitDays);
			}
		}
	}
}

function stateRating(state, rating) {
	"use strict";
	/*
	 * Produce a rating number for a given state.
	 */
	if(state.nAllowedDays <= 0) {
		return 0;
	} else {
		return Math.min(Math.round((state.nOverDays / state.nAllowedDays)*100,3),100);
	}
}

function selectColor(palette, type, rating) {
	"use strict";
	/*
	 * Convert a palette color to a hex color code.
	 */
	var color;
	switch (type) {
		case "bgcolor":
			color =  colorPaletteX[palette].bgcolor[Math.max((Math.round(rating/(100/colorPaletteX[palette].bgcolor.length))-1),0)];
			break;
		case "color":
			color = colorPaletteX[palette].color[Math.max((Math.round(rating/(100/colorPaletteX[palette].color.length))-1),0)];
			break;
		default:
			color = "#000000";
	}
	return color;
}

function setupMobileSelector() {
	"use strict";
	/*
	 * Setup the mobile selector, which is a dropdown list that gets shown
	 * when the user clicks on the map.
	 */
	$("div#mobileStateSelector").dialog({
		autoOpen: false,
		modal: true,
		title: "Select state",
		resizable: false,
		open: function(state) {
			var markup = '<select id="stateSelector">';
			$.each(states, function(state){
        		if(state == _tl.currentState) {
        			markup += '<option value = "' + state +
        			'" selected>' + states[state].name  + '</option>';
        		} else {
        			markup += '<option value = "' + state +
        			'">' + states[state].name  + '</option>';
        		}
        	});
        	markup += "</select>";
        	$(this).html(markup);
		},
		close: function() {
		},
		buttons: {
        	"Submit": function() {
        		_tl.currentState = $("select#stateSelector").val();
				for (var i = 0; i < views.length; i++) {
					if(views[i].type == "tableSingle") {
						showMapTable(views[1], _tl.currentState);
						break;
					}
				}
          		$(this).dialog("close");
          	},
          	"Cancel": function() {
          		$(this).dialog("close");
          	},
        }
	});
}

function createOptionsDialog() {
	"use strict";
	/*
	 * Create the options dialog, which includes a dynamically generated list of
	 * available colors with the currently selected color marked as selected.
	 */
	$("div#optionsDialog").dialog({
		autoOpen: false,
		modal: true,
		title: "Change Options",
		resizable: false,
		open: function() {
			var markup = '<select id="paletteSelect">';
        	$(colorPaletteX).each(function(index) {
        		if(index == _tl.selectedPalette) {
        			markup += '<option value = "' + index +
        			'" selected>' + colorPaletteX[index].name  + '</option>';
        		} else {
        			markup += '<option value = "' + index +
        			'">' + colorPaletteX[index].name  + '</option>';
        		}
        	});
        	markup += "</select>";
        	$(this).html(markup);
        },
        close: function() {
        	$(this).html("");
        	$('li#options a').blur();
        },
		buttons: {
        	"Submit": function() {
        		_tl.selectedPalette = $("select#paletteSelect").val();
				updateViews();
          		$(this).dialog("close");
          	},
          	"Cancel": function() {
          		$(this).dialog("close");
          	},
        }
	});
	$("li#options").click(function() {
		$("div#optionsDialog").dialog("open");
	});
}

function setupSlider() {
	"use strict";
	/*
	 * Create the slider for setting the limit, which includes creating a select list for
	 * the limit range as well. Note that the slider and drop down are synchronized. This
	 * function will recalculate the legislator and state data based on the new limit setting.
	 * If available, both the map and table are colored as well. 
	 * 
	 */
	$("input#limit").val(_tl.limitYears);
	$("#limitSlider").slider({
		min: _tl.limitLowValue,
		max: _tl.limitHighValue,
		value: _tl.limitYears,
		slide: function(event, ui) {
			//$("div#limitAmount").html("Limit (6-30): " + ui.value + " years");
			_tl.limitYears = parseInt(ui.value);
			_tl.limitDays = 365*_tl.limitYears;
			calculateInfo(states);
			updateViews();
			$('div#limitSelector select').val(_tl.limitYears);
      	},
    });
    /*
     * Create option list for the dropdown limit selector.
     */
    var html = "";
    for(var i = _tl.limitLowValue; i<=_tl.limitHighValue; i++) {
		html += '<option value="' + i + '">' + i + ' years</option>';
	}
	$("div#limitSelector select").html(html);
	$("div#limitSelector select").change(function() {
		var limit = $(this).val();
		$("#limitSlider").slider("value",  limit);
		_tl.limitYears = parseInt(limit);
		_tl.limitDays = 365*_tl.limitYears;
		calculateInfo(states);
		updateViews();
	});
	$('div#limitSelector select').val(_tl.limitYears);
}

function updateViews() {
	"use strict";
	/*
	 * Update any views.
	 */
	for(var i=0; i < views.length; i++) {
		switch (views[i].type) {
			case "map":
				colorMap(views[i]);
				break;
			case "tableTotal":
			case "tableSingle":
				colorTable(views[i]);
				break;
			case "chartState":
				fillChart(views[i]);
				break;
			case "tableChartState":
				fillChartTable(views[i]);
				break;
		}
	}
}

function fillTable(view, state) {
	/*
	 * Fill a table with a state header and legislators.
 	*/
	"use strict";
	$(view.element).find("tbody").empty();
	/*
	 * If the state isn't set then just create a single state entity.
	 */
	if(state) {
		fillTableState(view, state);
	} else {
		for (var newState in states) {
			fillTableState(view, newState);
		}
	}
	$('td a').click(function(e) {
		var $tr = $(this).parent().parent();
		$('div#personInfo').data("person", $tr.data("person")).data("state", $tr.data("state"));
		e.preventDefault();
		$('div#personInfo').dialog("open");
	});	
	windowResize();
}

function fillTableState(view, state) {
	"use strict";
	var $tr;
	/*
	 * Output state information as a table element.
	 */
	 if(view.type == "tableSingle") {
	 	$tr = $(view.element).find('thead > tr').first();
	 	$tr.replaceWith('<tr data-state="' + state + 
		'"><th colspan="3" class="header-state">' + states[state].name + '</th></tr>');
	 } else {
	 	$(view.element).append($('<tr data-state="' + state + 
		'"><td colspan="3" class="header-state">' + states[state].name + '</td></tr>'));
	 }
	/*
	 * Spin through the legislator list.
	 */
	for (var key in states[state].legislators) {
		$tr = $("<tr></tr>");
		var $tdName = $('<td><a href="#" >' + states[state].legislators[key].nameFull + '</a></td>');
		var $tdYears = $('<td>' + Math.round(states[state].legislators[key].nDays / 365) + '</td>');
		/*
		 * Show legislative chamber.
		 */
		 var $tdOffice = $('<td>' + getChamber(state, key) + '</td>');
		/*
		 * Place this legislator into the table.
		 */
		$tr.append($tdName).append($tdYears).append($tdOffice);
		$tr.attr("data-person", key).attr("data-state", state);
		$(view.element).append($tr);
	}
}

function getChamber(state, person) {
	"use strict";
	if (states[state].legislators[person].type === "sen") {
		return "Senate";
	} else {
		return "House";
	}
}

function colorTable(view) {
	"use strict";
	/*
	 * Spin through all state rows - color them appropriately and update the rating.
	 */
	$(view.element).find("tr[data-state]:not([data-person])").each(function() {
		var $state = $(this);
		var state = $state.data("state");
		colorState(view, state, $state);
		/*
		 * Now color the state's legislators.
		 */
		$(view.element).find('tr[data-state="' + state + '"][data-person]').each(function() {
			var $person = $(this);
			var key = $(this).data("person");
			colorPerson($person, state, key);
			$person.removeClass("over-limit under-limit");
			if(states[state].legislators[key].nDays >= _tl.limitDays) {
				$person.addClass('over-limit');
			} else {
				$person.addClass('under-limit');
			}
		});
	});
}

function colorState(view, state, $state) {
	"use strict";
	var $tr = (view.type == 'tableSingle') ?
		$(view.element).find('thead > tr').first()
	:
		$tr = $state;
	$tr.css("background-color", selectColor(_tl.selectedPalette, "bgcolor", stateRating(states[state])));
	$tr.css("color", selectColor(_tl.selectedPalette, "color", stateRating(states[state])));
}

function colorMap(view) {
	"use strict";
	/*
	 * Paint the states with color.
	 */
	for (var state in states) {
		$("#"+state).css("fill", selectColor(_tl.selectedPalette, "bgcolor", stateRating(states[state])));
	}
}

function colorPerson($el, state, person) {
	"use strict";
	$el.removeClass("over-limit under-limit");
	if(states[state].legislators[person].nDays >= _tl.limitDays) {
		$el.addClass('over-limit');
	} else {
		$el.addClass('under-limit');
	}
}

function showMapTable(view, state) {
	"use strict";
	/*
	 * Show the table on the map page.
	 */
	fillTable(view, state);
	colorTable(view);
	_tl.currentState = state;
	$("aside").height($("#vmap").height());
	$("aside#person").hide();
	$("aside#table").show();
}
/***************************************************************************************
****************************************************************************************
 * Chart functions.
 ****************************************************************************************
 ***************************************************************************************/
function initChart(view, num) {
	"use strict";
	
	var ctx = view.element.getContext("2d");
	var barChartData = {
		labels: [],
		datasets : [
			{
				fillColor : "rgba(220,220,220,0.5)",
				strokeColor : "rgba(220,220,220,0.8)",
				highlightFill: "rgba(220,220,220,0.75)",
				highlightStroke: "rgba(220,220,220,1)",
				data : []
			}
		],
		responsive:true,
	};
	var barChart = new Chart(ctx).Bar(barChartData, {
		labels : [],
		datasets : [
			{
				fillColor : "rgba(220,220,220,0.5)",
				strokeColor : "rgba(220,220,220,0.8)",
				highlightFill: "rgba(220,220,220,0.75)",
				highlightStroke: "rgba(220,220,220,1)",
				data : []
			}],
			responsive: true,
			animation: false,
			scaleOverride : true,
        	scaleSteps : 1,
        	scaleStepWidth : 60,
        	scaleStartValue : 0,
	});
	/*
	 * Setup the chart with initial labels and the proper colors.
	 */
	for (var i = 0; i < 5; i++) {
		barChart.addData([1],getLabel(i, 5,100));
		barChart.datasets[0].bars[i].fillColor = colorPaletteX[_tl.selectedPalette].bgcolor[i];
		barChart.datasets[0].bars[i].strokeColor = colorPaletteX[_tl.selectedPalette].color[i];
		barChart.datasets[0].bars[i].showStroke = false;
	}
	view.obj = barChart;
}

function fillChart(view) {
	"use strict";
	if (view.type == "chartState") {
		fillStateChart(view, states);
	} else {
		fillPeopleChart(view, states);
	}
}

function fillStateChart(view, states) {
	"use strict";
	/*
	 * Fill out the chart by state information. Compute the data and fill in the chart data.
	 */
	var buckets = Array.apply(null, new Array(_tl.nBuckets)).map(Number.prototype.valueOf,0);
	for (var state in states)  {
		buckets[stateRatingToBucket(stateRating(states[state]), _tl.nBuckets)]++;
	}
	for (var i = 0; i < _tl.nBuckets; i++) {
		view.obj.datasets[0].bars[i].value = buckets[i];
		view.obj.datasets[0].bars[i].fillColor = colorPaletteX[_tl.selectedPalette].bgcolor[i];
		view.obj.datasets[0].bars[i].strokeColor = colorPaletteX[_tl.selectedPalette].color[i];
	}
	view.obj.update();
}

function getLabel(val, num, tot) {
	"use strict";
	return (val > num - 2) ?
		((tot/num)*val).toString() + "+"
	:
		((tot/num)*val).toString() + "-" + ((tot/num)*(val+1)-1).toString();
}

function fillPeopleChart(chart, states) {
	"use strict";
	/*
 	 * Fill in the chart with people information.
	 */
	var i;
	var buckets = Array.apply(null, new Array(_tl.nBuckets)).map(Number.prototype.valueOf,0);
	for (var state in states) {
		for (i = 0; i < states[state].legislators.length; i++) {
			var rating = Math.max(Math.round(((states[state].legislators[i].nDays -
				_tl.limitDays) / _tl.limitDays)*100),0);
			buckets[personRatingToBucket(rating, _tl.nBuckets)]++;
		}
	}
	for (i = 0; i < _tl.nBuckets; i++) {
		chart.datasets[0].bars[i].value = buckets[i];
	}
	chart.update();
}

function stateRatingToBucket(rating, num) {
	"use strict";
	/*
 	 * Return the appropriate bucket (0 to num-1 ) for a given state rating.
	 */
	for (var i = 0; i < num; i++) {
		if (rating < (i+1)*(_tl.topRating/num)) {
			return i;
		}
	}
	return (num - 1);
}

function personRatingToBucket(rating, num) {
	"use strict";
	/*
 	 * Return the appropriate bucket (0 to num-1 ) for a given person rating.
	 */
	for (var i = 1; i < num-1; i++) {
		if (rating < i*(_tl.topRating/num)) {
			return i-1;
		}
	}
	return num - 1;
}
/*
 * Setup display color array. These colors were selected using http://colorbrewer2.org/. There are 5 data classes
 * and the specific color palette is denoted after each selection.
 *
 * The colors grow more intense as the index increases from 0 - 5.
 */
var colorPaletteX = [
	{bgcolor: ["#ffffb2","#fecc5c","#fd8d3c","#f03b20","#bd0026"], color: ["#000000", "#000000", "#ffffff", "#ffffff", "#ffffff"], name: "Yellow/Red"},
	{bgcolor: ["#f7f7f7","#cccccc","#969696","#636363","#252525"], color: ["#000000", "#000000", "#ffffff", "#ffffff", "#ffffff"], name: "Greys"},
	{bgcolor: ["#f2f0f7","#cbc9e2","#9e9ac8","#756bb1","#54278f"], color: ["#000000", "#000000", "#ffffff", "#ffffff", "#ffffff"], name: "Purples"},
	{bgcolor: ["#feedde","#fdbe85","#fd8d3c","#e6550d","#a63603"], color: ["#000000", "#000000", "#ffffff", "#ffffff", "#ffffff"], name: "Oranges"},
	{bgcolor: ["#ffffcc","#c2e699","#78c679","#31a354","#006837"], color: ["#000000", "#000000", "#ffffff", "#ffffff", "#ffffff"], name: "Yellow/Green"},
	];

_tl.InfoCard = (function() {
	
	function buildHTML(state, legislator) {
		"use strict";
		/*
		 * Build all of the HTML required for creating an information popup
		 * about a legislator.
		 */
		var person = states[state].legislators[legislator];
		var html = '<div class="personName">' + person.nameFull + '</div>' +
			'<hr>' +
			'<div class="personChamber">Chamber: ' + 
			((person.type == "sen") ?
				'Senate'
			:	
				'House') + '</div>' +
			'<div class="personDate">First elected: ' + 
			$.datepicker.formatDate('MM d, yy', new Date(person.dateStart)) + '</div>' +
			/*
			 * Include Ballotpedia if available.
			 */
			'<div class="personBallotpedia">' +
			((person.ballotpedia) ? 
				'<a href="http://ballotpedia.org/' + person.ballotpedia +
				'" target="_blank">Ballotpedia info</a><img src="images/new-window.png"></div>'
			:
				'Ballotpedia unavailable</div>') +
			/*
			 * Include Bioguide if available.
			 */
			'<div class="personBioguide">' +
			((person.bioguide) ?
				'<a href="http://bioguide.congress.gov/scripts/biodisplay.pl?index='+
				person.bioguide +
				'" target="_blank">Bioguide info</a><img src="images/new-window.png"></div>'
			:
				'Bioguide unavailable</div>') +
			/*
			 * Include Votesmart if available.
			 */
			'<div class="personVotesmart">' +
			((person.votesmart) ?
				'<a href="http://votesmart.org/candidate/' + person.votesmart +
				'" target="_blank">VoteSmart info</a><img src="images/new-window.png"></div>'
			:
				'VoteSmart unavailable</div>') +
			/*
			 * And an interesting fact if the person has been around past the limit.
			 */
			'<div class="personFact">' +  
			((person.nDays >= _tl.limitDays) ?
				'<img src="' + _tl.facts.getImage(new Date(person.dateStart).getFullYear()) + 
				'" alt="no image"><p> ' + person.nameFirst + ' was first elected before the ' +
				_tl.facts.getFact(new Date(person.dateStart).getFullYear()) +  '.</p></div>'
			:
				'</div>');
		return html;
	}
	return {
		buildHTML: buildHTML,
	};
})();

_tl.facts = (function() {
	/*
	 * Manages the returning of information about a fact associated with a specific year in 
	 * history.
	 */
	var factsByYear = [
		{year: 1976, event: "Apple 1 was introduced", image:"images/apple1.png"},
		{year: 1981, event: "IBM PC was introduced", image:"images/ibmpc.png"},
		{year: 1985, event: "Microsoft Windows operating system was launched", image:"images/windows1.png"},
		{year: 1990, event: "World Wide Web was invented", image:"images/earlygoogle.png"},
		{year: 1995, event: "DVD was invented", image:"images/dvd.png"},
		{year: 2001, event: "iPod was introduced", image:"images/ipod.png"},
		{year: 2003, event: "Toyota Hybrid (Prius) was introduced", image:"images/prius.png"},
		{year: 2004, event: "First DVR (Tivo) was introduced", image:"images/tivo.png"},
		{year: 2005, event: "YouTube went live", image:"images/youtube.png"},
		{year: 2007, event: "Apple iPhone was introduced", image:"images/iphone.png"},
		{year: 2010, event: "Apple iPad was introduced", image:"images/ipad.png"}];

	function getIndex(year) {
		"use strict";
		for(var i=0; i < factsByYear.length; i++) {
		if(year <= factsByYear[i].year)
			return i;
		}
		return factsByYear.length-1;
	}
	
	function getFact(year) {
		"use strict";
		return factsByYear[getIndex(year)].event;
	}
	
	function getImage(year) {
		"use strict";
		return factsByYear[getIndex(year)].image;
	}
	return {
		getFact:getFact,
		getImage:getImage
	};
})();
_tl.setup = (function(_tl) {
	var tl = _tl;
	
	function setupVars(defaults) {
		"use strict";
		tl.nBuckets = defaults.nBuckets;
		tl.selectedPalette = defaults.selectedPalette;
		tl.limit = defaults.limitYears;
		tl.touchDevice = false;
		tl.limitLowValue = defaults.limitLowValue;
		tl.limitHighValue = defaults.limitHighValue;
		tl.limitYears = defaults.limitYears;
		tl.limitDays = tl.limitYears * 365;
		tl.currentState = defaults.currentState;
		tl.topRating = defaults.topRating;
		/*
	 	 * Set options either to default or to previously stored options. Note that
		 * some utilities (such as UTM...) add cookies, so the last variable must
	 	 * be trimmed.
		 */
		if(document.cookie) {
			var cookiearray = document.cookie.split(',');
			for(var i=0; i<cookiearray.length; i++) {
				switch (cookiearray[i].split('=')[0]) {
					case "_termLimits_palette":
						tl.selectedPalette = parseInt(cookiearray[i].split('=')[1]);
						if(isNaN(tl.selectedPalette)) tl.selectedPalette = defaults.selectedPalette;
						break;
					case "_termLimits_limit":
						tl.limitYears = parseInt(cookiearray[i].split('=')[1]);
						if(isNaN(_tl.limitYears)) tl.limitYears = defaults.limitYears;
						tl.limitDays = 365*tl.limitYears;
						break;
					case "_termLimits_state":
						tl.currentState = cookiearray[i].split('=')[1].substr(0,2);
						break;
					default:
						break;
				}
			}
		}
		/*
		 * Determine if we're on a touchscreen device.
		 */
		tl.touchDevice = 'ontouchstart' in document.documentElement;
	}

	return {
		setupVars : setupVars
	};
})(_tl);