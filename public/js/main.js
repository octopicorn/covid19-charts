let menuData;
let covData;
let populationsData;
let chart;
let chartConfig;
let isMobile;

let settings = {
  showConfirmed: true,
  showDeaths: false,
  showRecovered: false,
  snapTo: true,
  snapToNumber: 100,
  normalizePopulation: false,
  normalizeDelta: false,
  normalizeDoubling: false,
  plotType: 'linear',
}

let areasOfInterest = {
  countries: ['Italy', 'Spain', 'France', 'United Kingdom', 'Canada', 'US'],
  states: [],
  counties: [],
}

let detectMobile = {
  Android: function() {
    return navigator.userAgent.match(/Android/i);
  },
  BlackBerry: function() {
    return navigator.userAgent.match(/BlackBerry/i);
  },
  iOS: function() {
    return navigator.userAgent.match(/iPhone|iPad|iPod/i);
  },
  Opera: function() {
    return navigator.userAgent.match(/Opera Mini/i);
  },
  Windows: function() {
    return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
  },
  any: function() {
    return (detectMobile.Android() || detectMobile.BlackBerry() || detectMobile.iOS() || detectMobile.Opera() || detectMobile.Windows());
  }
};

function searchList(group, searchTerm) {
  let results;

  if (group === 'counties') {
    results = menuData[group].filter(item => {
      return item[0].toLowerCase().indexOf(searchTerm) === 0
    });
  } else {
    results = menuData[group].filter(item => {
      return item.toLowerCase().indexOf(searchTerm) === 0;
    });
  }

  switch (group) {
    case 'countries':
      renderMenuCountries(results);
      break;
    case 'states':
      renderMenuStates(results);
      break;
    case 'counties':
      renderMenuCounties(results);
      break;
  }

  bindMenus();
}

function renderMenuCountries(overrideList) {
  const list = overrideList || menuData && menuData.countries;
  if (list) {
    const $menuList = $('#menu-countries');
    $menuList.empty();
    for (const country of list){
      const selected = areasOfInterest.countries.includes(country) ? 'selected' : '';
      $menuList.append(`<div class="menu-list-item ${selected}" data-name="${country}" data-list-type="countries" data-type="country">${country}</div>`);
    }
  }
}

function renderMenuStates(overrideList) {
  const list = overrideList || menuData && menuData.states;
  if (list) {
    const $menuList = $('#menu-states');
    $menuList.empty();
    for (const state of list){
      const selected = areasOfInterest.states.includes(state) ? 'selected' : '';
      $menuList.append(`<div class="menu-list-item ${selected}" data-name="${state}" data-list-type="states" data-type="state">${state}</div>`);
    }
  }
}

function renderMenuCounties(overrideList) {
  const list = overrideList || menuData && menuData.counties;
  if (list) {
    const $menuList = $('#menu-counties');
    $menuList.empty();
    for (const county of list){
      const areaName = `${county[0]}, ${county[1]}`;
      const selected = areasOfInterest.counties.includes(areaName) ? 'selected' : '';
      $menuList.append(`<div class="menu-list-item ${selected}" data-name="${areaName}" data-list-type="counties" data-type="county">${areaName}</div>`);
    }
  }
}

function showClearListIcon(group) {
  const id = `#clear-search-list-input-${group}`;
  $(id).show();
}

function hideClearListIcon(group) {
  const id = `#clear-search-list-input-${group}`;
  $(id).hide();
}

function bindMenus() {

  $('.menu-list-item').on('click', function() {

    const group = $(this).data('list-type');

    const areaName = $(this).data('name');
    const areaType = $(this).data('type');

    if ($(this).hasClass('selected')) {

      // toggle button selected
      $(this).removeClass('selected');

      // remove from areas of interest
      let indexToRemove;
      let listToRemoveFrom;

      switch (areaType) {
        case 'country':
          listToRemoveFrom = areasOfInterest.countries;
          break;
        case 'state':
          listToRemoveFrom = areasOfInterest.states;
          break;
        case 'county':
          listToRemoveFrom = areasOfInterest.counties;
          break;
      }
      if (listToRemoveFrom) {
        indexToRemove = listToRemoveFrom.findIndex(item => item === areaName);

        if (indexToRemove > -1) {
          listToRemoveFrom.splice(indexToRemove, 1);
        }

      }

    } else {

      // toggle button selected
      $(this).addClass('selected');

      // add to areas of interest
      let listToAddTo;

      switch (areaType) {
        case 'country':
          listToAddTo = areasOfInterest.countries;
          break;
        case 'state':
          listToAddTo = areasOfInterest.states;
          break;
        case 'county':
          listToAddTo = areasOfInterest.counties;
          break;
      }
      if (listToAddTo) {
        const currentIndexOf = listToAddTo.findIndex(item => item === areaName);
        if (currentIndexOf < 0) {
          listToAddTo.push(areaName);
        }
      }
    }

    drawChart();

  });
}

function bindButtons(){

  $('.button-change-chart-type').on('click', function() {
    $('.button-change-chart-type').removeClass('selected');
    $(this).addClass('selected');

    const newChartType = $(this).data('type');
    updateChartType(newChartType);
  });

  $('.button-change-chart-scale').on('click', function() {
    $('.button-change-chart-scale').removeClass('selected');
    $(this).addClass('selected');

    const newScaleType = $(this).data('type');
    updateChartScale(newScaleType);
  });

  $('.button-change-chart-transform').on('click', function() {
    $('.button-change-chart-transform').removeClass('selected');
    $(this).addClass('selected');

    const newType = $(this).data('type');
    updateChartDataTransform(newType);
  });

  $('.button-change-timeseries-data-type').on('click', function() {
    $('.button-change-timeseries-data-type').removeClass('selected');
    $(this).addClass('selected');

    const newDataType = $(this).data('type');
    updateTimeseriesDataType(newDataType);
    drawChart();
  });

  $('#chart-palette').on('change', function() {
    const newPalette = $(this).val();
    updateChartPalette(newPalette);
  });

  $('#snapToToggle').on('click', function() {
    const isChecked = $(this).is(":checked");
    settings.snapTo = isChecked;
    if (isChecked) {
      $(this).prop("checked", "checked");
    } else {
      $(this).prop("checked", undefined);
    }
    drawChart();
  });

  $('#snap-to-days-input').on('input', function(e) {
    e.preventDefault();
    const newVal = Number($(this).val());
    if (newVal !== NaN && newVal > 0) {
      settings.snapToNumber = newVal;
      drawChart();
    }
  })

  $('.clear-data').on('click', function (e) {
    e.preventDefault();

    // unselect all menu items from this group
    $(this).next('.menu-list').find('.menu-list-item').each(function() {
      $(this).removeClass('selected')
    });

    // now clear the group, and re-render the chart
    const group = $(this).data('group');
    areasOfInterest[group] = [];
    drawChart();
  });
  $('#clear-all-chart-data').on('click', function(e) {

    e.preventDefault();
    // unselect all menu items
    $('.menu-list-item').each(function() {
      $(this).removeClass('selected')
    });
    areasOfInterest.countries = [];
    areasOfInterest.states = [];
    areasOfInterest.counties = [];
    drawChart();

  })

  $('.search-menu-list-input').on('input', function(e) {
    const group = $(this).data('group');
    if ($(this).val() === '') {
      hideClearListIcon(group);
    } else {
      showClearListIcon(group);
    }
    searchList(group, $(this).val())
  });

  $('.clear-list-search').on('click', function(e) {

    e.preventDefault();
    $(this).prev().val('');
    $(this).hide();

    const group = $(this).data('group');
    switch (group) {
      case 'countries':
        renderMenuCountries();
        break;
      case 'states':
        renderMenuStates();
        break;
      case 'counties':
        renderMenuCounties();
        break;
    }
    bindMenus();
  })

  $('.button-change-line-width').on('click', function(e){
    settings.lineWidth = $(this).data('value');

    $('.button-change-line-width').removeClass('selected');
    $(this).addClass('selected');

    drawChart();
  });
}

function snapDataToFirstDay (data) {

  let snapToNumber = settings.snapToNumber;


  let result = []; // in best case scenario, number of cases has never been reached, in which case we have default empty dataset

  // if we found a "first n" day, truncate the data array to start from that day
  const indexOfFirstDay = data.findIndex(item => item >= snapToNumber);
  if (indexOfFirstDay >= 0){
    result = data.slice(indexOfFirstDay);
  }

  return result;

}

function normalizeDataByPopulation (data, group, name) {

  let populationData;
  switch (group) {
    case 'countries':
      populationData = populationsData.countries[name];
      break;
    case 'states':
      populationData = populationsData.states[name];
      break;
    case 'counties':
      populationData = populationsData.counties[name];
      break;
  }

  let result = [];

  if (populationData) {
    result = data.map(item => {
      return item / (populationData / 100000);
    });
  }

  return result;

}

function normalizeDataByDelta (data) {

  result = data.map((item, index) => {
    if (index === 0) {
      // first data point, delta is just the number - 0
      return item;
    }
    // return delta between data point and last one
    return item - data[index - 1];
  });

  return result;

}

function normalizeDataByDoubling (data) {
  let daysToDouble = 6; // start with a sensible default
  result = data.map((item, index) => {
    let prevItem;
    if (index === 0) {
      // first data point, delta is just the number - 0
      prevItem = 0;
    } else {
      prevItem = data[index - 1];
    }

    // by what percent is today greater than yesterday?
    const rate = (item/prevItem) - 1;

    if (rate === 0) {
      // instead of showing Infinity on the chart, just show value as not having changed
      newDaysToDouble = daysToDouble;
    } else {
      // use the law of 72 to estimate days to double
      newDaysToDouble = 72 / (rate* 100);

      // this is a smoothing correction
      // some days due to bad reporting, the number does not change
      // this throws off the chart by plotting outlier points way off
      // which throws off the scale and makes it hard to read
      if ((newDaysToDouble - daysToDouble) > 5) {
        newDaysToDouble = daysToDouble;
      }
      daysToDouble = newDaysToDouble;
    }

    return newDaysToDouble;
  });

  return result;
}

function drawChart() {

  let datasets = [];

  let pointBorderWidth;
  let pointRadius;
  let borderWidth;

  let lineWidthSetting = settings.lineWidth || 2;

  borderWidth = 0;
  if (lineWidthSetting === 1) {
    pointBorderWidth = isMobile  ? 0 : 1;
    pointRadius = isMobile  ? 0 : 1;
  } else if (lineWidthSetting === 2) {
    pointBorderWidth = isMobile  ? 0 : 0;
    pointRadius = isMobile  ? 1 : 2;
  } else if (lineWidthSetting === 3) {
    pointBorderWidth = isMobile  ? 2 : 3;
    pointRadius = isMobile  ? 1 : 3;
  }

  const defaultOptions = {
    fill: false,
    borderWidth,
    pointBorderWidth,
    pointRadius,
  };

  let dataCategory = 'Confirmed';
  if (settings.showDeaths) {
    dataCategory = 'Deaths';
  } else if (settings.showRecovered) {
    dataCategory = 'Recovered';
  }

  let timeSeriesMaxLength = 0;

  // plot countries
  for (country of areasOfInterest.countries) {

    let data = covData.timeseries.countries[country].timeseriesByCategory[dataCategory] || [];

    const label = country;
    // if snapTo setting is activated, truncate data to start from day of first 100
    if (settings.snapTo){
      data = snapDataToFirstDay(data);
      timeSeriesMaxLength = Math.max(timeSeriesMaxLength, data.length);
    }

    if (settings.normalizePopulation) {
      data = normalizeDataByPopulation(data, 'countries', country);
    } else if (settings.normalizeDelta) {
      data = normalizeDataByDelta(data);
    } else if (settings.normalizeDoubling) {
      data = normalizeDataByDoubling(data);
    }

    dataset = {
      ...defaultOptions,
      label,
      data,
    }
    datasets.push(dataset);
  }

  // plot states
  for (state of areasOfInterest.states) {

    let data = covData.timeseries.states[state].timeseriesByCategory[dataCategory] || [];
    const label = state;

    // if snapTo setting is activated, truncate data to start from day of first 100
    if (settings.snapTo){
      data = snapDataToFirstDay(data);
      timeSeriesMaxLength = Math.max(timeSeriesMaxLength, data.length);
    }
    if (settings.normalizePopulation) {
      data = normalizeDataByPopulation(data, 'states', state);
    } else if (settings.normalizeDelta) {
      data = normalizeDataByDelta(data);
    } else if (settings.normalizeDoubling) {
      data = normalizeDataByDoubling(data);
    }

    dataset = {
      ...defaultOptions,
      label,
      data,
    }
    datasets.push(dataset);

  }

  // plot counties
  for (county of areasOfInterest.counties) {
    let data = covData.timeseries.counties[county].timeseriesByCategory[dataCategory] || [];
    const label = county;

    // if snapTo setting is activated, truncate data to start from day of first 100
    if (settings.snapTo){
      data = snapDataToFirstDay(data);
      timeSeriesMaxLength = Math.max(timeSeriesMaxLength, data.length);
    }

    if (settings.normalizePopulation) {
      data = normalizeDataByPopulation(data, 'counties', county)
    } else if (settings.normalizeDelta) {
      data = normalizeDataByDelta(data);
    } else if (settings.normalizeDoubling) {
      data = normalizeDataByDoubling(data);
    }

    dataset = {
      ...defaultOptions,
      label,
      data,
    }
    datasets.push(dataset);
  }

  let title = ''
  if (settings.showConfirmed) {
    title = 'Confirmed Cases';
  } else {
    title = dataCategory;
  }

  chartConfig.options.title = {
    display: true,
    text: title,
  };

  let yAxisLabel = '';
  if (settings.showConfirmed) {
    yAxisLabel = `Confirmed Cases`;
  } else if (settings.showDeaths) {
    yAxisLabel = `Deaths`;
  } else if (settings.showRecovered) {
    yAxisLabel = `Recovered`;
  }

  if (settings.normalizePopulation) {
    yAxisLabel = `${yAxisLabel} per 100k people`;
  } else if (settings.normalizeDelta) {
    yAxisLabel = `${yAxisLabel} daily change`;
  } else if (settings.normalizeDoubling) {
    yAxisLabel = `${yAxisLabel} - Days to double`;
  }

  if (settings.plotType === 'logarithmic') {
    yAxisLabel = `${yAxisLabel} (log scale)`;
  }

  chartConfig.options.scales.yAxes[0].scaleLabel.labelString = yAxisLabel;

  chartConfig.data.datasets = datasets;

  chartConfig.data.labels = covData.timeseriesDays;

  // if snap to 100 feature is activated, use a different x-axis with generic day numbers
  if (settings.snapTo) {
    const truncatedXAxis = [...Array(timeSeriesMaxLength).keys()].map((item) => `Day ${item + 1}`);
    chartConfig.data.labels = truncatedXAxis;
  }



  chart.data = chartConfig.data;
  chart.options = chartConfig.options;
  chart.update();
}

function updateChartType(newType) {
  if (chart) {
    chart.destroy();
  }

  var temp = $.extend(true, {}, chartConfig);
  temp.type = newType; // The new chart type

  var ctx = $('#chart-placeholder');

  chart = new Chart(ctx, temp);
}

function fnum(x) {
  if(isNaN(x)) return x;

  if(x < 999) {
    return x;
  }

  if(x < 1000000) {
    return Math.round(x/1000) + "K";
  }
  if( x < 10000000) {
    return (x/1000000).toFixed(2) + "M";
  }

  if(x < 1000000000) {
    return Math.round((x/1000000)) + "M";
  }

  if(x < 1000000000000) {
    return Math.round((x/1000000000)) + "B";
  }

  return "1T+";
}

function updateChartScale(newType) {
  settings.plotType = newType;

  chart.options.scales.yAxes[0] = {
    ...chart.options.scales.yAxes[0],
    type: newType,
    ticks: {
      callback: function (value, index, values) {

        if (settings.plotType === 'logarithmic') {
          return fnum(value);
        }
        return Number(value.toString()); // pass tick values as a string into Number function
      }
    },
  };
  chart.update();

  drawChart();


}

function updateChartDataTransform(newType) {

  if (newType === 'population') {
    settings.normalizePopulation = true;
    settings.normalizeDelta = false;
    settings.normalizeDoubling = false;

    chart.update();
  } else if (newType === 'delta') {
    settings.normalizePopulation = false;
    settings.normalizeDelta = true;
    settings.normalizeDoubling = false;

    chart.update();
  } else if (newType === 'doubling') {
    settings.normalizePopulation = false;
    settings.normalizeDelta = false;
    settings.normalizeDoubling = true;

    chart.update();
  } else {
    settings.normalizePopulation = false;
    settings.normalizeDelta = false;
    settings.normalizeDoubling = false;

    chart.update();
  }

  drawChart();

}

function updateTimeseriesDataType(confirmedOrDeaths) {
  if (confirmedOrDeaths === 'confirmed') {
    settings.showConfirmed = true;
    settings.showDeaths = false;
    settings.showRecovered = false;
  } else if (confirmedOrDeaths === 'deaths') {
    settings.showConfirmed = false;
    settings.showDeaths = true;
    settings.showRecovered = false;
  } else if (confirmedOrDeaths === 'recovered') {
    settings.showConfirmed = false;
    settings.showDeaths = false;
    settings.showRecovered = true;
  } else if (confirmedOrDeaths === 'both') {
    settings.showConfirmed = true;
    settings.showDeaths = true;
    settings.showRecovered = false;
  }

  // side effects on snapTo feature
  if (settings.showConfirmed && settings.showDeaths) {
    // uncheck and disable the snapTo feature if showing both
    $('#option-container-snapTo100').addClass('disabled');
    $('#option-container-snapTo100 input').prop("checked", false).attr('disabled', 'disabled');
    $('#option-container-snapTo1').addClass('disabled');
    $('#option-container-snapTo1 input').prop("checked", false).attr('disabled', 'disabled');
  } else {
    // restore the snapTo feature if showing just one
    $('#option-container-snapTo100').removeClass('disabled');
    $('#option-container-snapTo100 input').removeAttr('disabled');
    $('#option-container-snapTo1').removeClass('disabled');
    $('#option-container-snapTo1 input').removeAttr('disabled');
  }

}

function updateChartPalette(newPalette) {
  chartConfig.options.plugins.colorschemes.scheme = newPalette;

  chart.options.plugins.colorschemes.scheme = newPalette;
  chart.update();
}

function renderMenus() {
  renderMenuCountries();
  renderMenuStates();
  renderMenuCounties();
}

function updateDataFromLatestRefresh(todayDataResponse) {
  // todayData has the same object shape as the historical data
  /*
  timeseriesIndexToUpdate: 100,
  timeseries: {
    countries: {
      COUNTRY_NAME: {
        timeseriesByCategory: {
          'Confirmed': 0,
          'Recovered': 0,
          'Deaths': 0,
        }
      },
      ...
    },
    states: {
      ...
    }
  }
  */

  const {timeseriesIndexToUpdate} = todayDataResponse;
  const timeseriesToday = todayDataResponse.timeseries;

  if (timeseriesIndexToUpdate === covData.timeseriesDays.length) {
    covData.timeseriesDays.push('Today');
  }
  // loop through and update states
  Object.keys(timeseriesToday.states).forEach(state => {
    if (covData.timeseries.states[state] && covData.timeseries.states[state].timeseriesByCategory) {
      covData.timeseries.states[state].timeseriesByCategory['Confirmed'][timeseriesIndexToUpdate] = timeseriesToday.states[state].timeseriesByCategory['Confirmed'];
      // covData.timeseries.states[state].timeseriesByCategory['Recovered'][timeseriesIndexToUpdate] = timeseriesToday.states[state].timeseriesByCategory['Recovered'];
      covData.timeseries.states[state].timeseriesByCategory['Deaths'][timeseriesIndexToUpdate] = timeseriesToday.states[state].timeseriesByCategory['Deaths'];
    }
  });

  // loop through and update countries
  Object.keys(timeseriesToday.countries).forEach(country => {
    if (covData.timeseries.countries[country] && covData.timeseries.countries[country].timeseriesByCategory) {
      covData.timeseries.countries[country].timeseriesByCategory['Confirmed'][timeseriesIndexToUpdate] = timeseriesToday.countries[country].timeseriesByCategory['Confirmed'];
      // covData.timeseries.countries[country].timeseriesByCategory['Recovered'][timeseriesIndexToUpdate] = timeseriesToday.countries[country].timeseriesByCategory['Recovered'];
      covData.timeseries.countries[country].timeseriesByCategory['Deaths'][timeseriesIndexToUpdate] = timeseriesToday.countries[country].timeseriesByCategory['Deaths'];
    }
  })

}

function getUrlQueryAsObject() {
  let result = {};
  // get URL query string
  let params = window.location.search;
  // remove the '?' character
  params = params.substr(1);
  // split the query parameters
  let queryParamArray = params.split('&');
  // iterate over parameter array
  queryParamArray.forEach(function(queryParam) {
    // split the query parameter over '='
    let item = queryParam.split('=');

    // save each as single value or expand into array when duplicates found
    if (typeof result[item[0]] !== 'undefined') {
      if (!Array.isArray(result[item[0]])) {
        result[item[0]] = [result[item[0]]];
      }
      result[item[0]].push(decodeURIComponent(item[1]));
    } else {
      result[item[0]] = decodeURIComponent(item[1]);
    }

  });


  return result;
}

$(function () {

  isMobile = detectMobile.any();

  // make cache buster for today's date, that way data will only need to be loaded one time per day
  // then be pulled form cache memory every subsequent request for that day

  const dateToday = new Date();
  const yearToday = dateToday.getFullYear();
  const monthToday = dateToday.getUTCMonth() + 1;
  const dayToday = dateToday.getUTCDate();

  const cachebuster =`${yearToday}-${monthToday}-${dayToday}`;



  let viewState;

  const defaultQueryParams = {

  }
  let queryObject = getUrlQueryAsObject();

  let defaultSettings = {
    metric: 'confirmed', // confirmed | deaths | resolved
    snapTo: true,
    snapToNumber: 100,
    normalizePopulation: false,
    normalizeDelta: false,
    normalizeDoubling: false,
    plotType: 'linear',
  }

  console.log(queryObject)


  $.when(

    // fetch the initial data
    $.ajax(`/menu.json?cb=${cachebuster}`),
    $.ajax(`/timeseries.json?cb=${cachebuster}`),
    $.ajax(`/populations.json?cb=${cachebuster}`),

    // also fetch up to the minute update from today
    // this feature is commented out below in the updating script
    // but this data could be used to show a dashboard similar to JH CSSE:
    // https://gisanddata.maps.arcgis.com/apps/opsdashboard/index.html
    // $.ajax('/today')

  )
    .done((menuResponse, timeseriesResponse, populationsResponse, todayResponse) => {

      // data has been loaded

      const [menu] = menuResponse;
      console.info('menu', menu);
      menuData = menu;

      const [data] = timeseriesResponse;
      console.info('timeseries', data);
      covData = data;

      const [populations] = populationsResponse;
      console.info('populations', populations);
      populationsData = populations;

      renderMenus();
      bindMenus();
      bindButtons();

      // todays date
      const todayDate = new Date();

      // set up chart
      chartConfig = {
        type: 'line',
        data: {
          labels: covData.timeseriesDays,
          datasets: [],
        },
        options: {
          maintainAspectRatio: false,
          plugins: {
            colorschemes: {
              //  many color palettes to choose from here: https://nagix.github.io/chartjs-plugin-colorschemes/
              scheme: 'tableau.ClassicColorBlind10',
            }
          },

          scales: {

            xAxes: [
              {
                scaleLabel: {
                  display: true,
                  labelString: `github.com/octopicorn/covid19-charts    Data: Johns Hopkins CSSE, usafacts.org, NYT`,
                  fontColor: '#333',
                  fontSize: 8,
                }
              }
            ],
            yAxes: [
              {
                scaleLabel: {
                  display: true,
                },
                ticks: {
                  beginAtZero: true,
                }
              }
            ],
          }
        }
      };

      var ctx = $('#chart-placeholder');
      chart = new Chart(ctx, chartConfig);


      // capability is there to pull the latest daya from today, but turned off for now because it gives false
      // impression that curve is getting better when it's actually just that we are only partially through the
      // given day. true comparative data is only visually valuable when we are comparing similar units of time
      // uncomment to see this working if you like...
      //
      // const [todayData] = todayResponse;
      // updateDataFromLatestRefresh(todayData);

      drawChart();

    })
    .fail(function (e) {
      //handle errors
      console.log(e)
    });


});