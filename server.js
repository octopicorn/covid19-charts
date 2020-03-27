const api = require('./api');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const csvParser = require('./csvParser');

moment.prototype.snapToDayStart = function(){
  this.set('hour', 0)
    .set('minute', 0)
    .set('second', 0)
    .set('millisecond', 0);
  return this;
}

// determine today's date in UTC, snap to beginning of day at 00:00:00.000 UTC
const dateToday = moment.utc()
  .snapToDayStart();
console.log('date today UTC is ', dateToday.format('YYYY-MM-DD'), '\n')

const categories = ['Confirmed', 'Deaths'];

let todayData = [];

let todayUSARegions = {};
let todayUSA = {};

const countriesOfInterest = ['US', 'Italy'];

const options = {
  alignToFirst100: false,
  splitByRegion: false,
  countries: [],
  regions: [],
  subregions: [],
};

const regionsUSA = {
  "AL": "Alabama",
  "AK": "Alaska",
  "AS": "American Samoa",
  "AZ": "Arizona",
  "AR": "Arkansas",
  "CA": "California",
  "CO": "Colorado",
  "CT": "Connecticut",
  "DE": "Delaware",
  "DC": "District Of Columbia",
  "FM": "Federated States Of Micronesia",
  "FL": "Florida",
  "GA": "Georgia",
  "GU": "Guam",
  "HI": "Hawaii",
  "ID": "Idaho",
  "IL": "Illinois",
  "IN": "Indiana",
  "IA": "Iowa",
  "KS": "Kansas",
  "KY": "Kentucky",
  "LA": "Louisiana",
  "ME": "Maine",
  "MH": "Marshall Islands",
  "MD": "Maryland",
  "MA": "Massachusetts",
  "MI": "Michigan",
  "MN": "Minnesota",
  "MS": "Mississippi",
  "MO": "Missouri",
  "MT": "Montana",
  "NE": "Nebraska",
  "NV": "Nevada",
  "NH": "New Hampshire",
  "NJ": "New Jersey",
  "NM": "New Mexico",
  "NY": "New York",
  "NC": "North Carolina",
  "ND": "North Dakota",
  "MP": "Northern Mariana Islands",
  "OH": "Ohio",
  "OK": "Oklahoma",
  "OR": "Oregon",
  "PW": "Palau",
  "PA": "Pennsylvania",
  "PR": "Puerto Rico",
  "RI": "Rhode Island",
  "SC": "South Carolina",
  "SD": "South Dakota",
  "TN": "Tennessee",
  "TX": "Texas",
  "UT": "Utah",
  "VT": "Vermont",
  "VI": "Virgin Islands",
  "VA": "Virginia",
  "WA": "Washington",
  "WV": "West Virginia",
  "WI": "Wisconsin",
  "WY": "Wyoming"
}

function prepareOptions (req) {

  console.log('querystring', req.query)

  // countries
  let countries = req.query.countries;
  if (!Array.isArray(countries)){
    countries = [countries];
  }
  options.countries = countries;

  // regions
  let regions = req.query.regions;
  if (!Array.isArray(regions)){
    regions = [regions];
  }
  options.regions = regions;

  // subRegions
  let subRegions = req.query.subRegions;
  if (!Array.isArray(subRegions)){
    subRegions = [subRegions];
  }
  options.subRegions = subRegions;

  console.log('options', options)
  return options;
}

const downloadHistoricalData = async() => {
  console.log('Update Historical Data');
  console.log('----------------------');

  // for each category
  for (const category of categories) {

    // V1 historical data
    // on 3/23/2020, JH CSSE changed data format, so all data up until that date will be called V1
    // V1 timeseries is different from V2 in the following ways:
    // - no cumulative US data, all regions have to be summed together to find US totals
    // - US data tallies are shown by state, and also by county. these can be used to show regional breakdowns

    // UPDATE - on 3/25/2020 JS CSSE remoced the V1 timeseries files from their github repo
    // as a result, I'm just committing the csv file to the repo
    // // if v1 historical data file doesn't exist, download it now
    // const pathV1 = path.join(__dirname, 'downloads', `${category}_v1.csv`);
    // if (!fs.existsSync(pathV1)) {
    //   // we should download if no file exists yet
    //   console.log(`Downloading V1 data ${pathV1}`)
    //   //file does not exist
    //   const file = fs.createWriteStream(pathV1);
    //   await api.fetchDataHistoricalV1(category, file);
    // }

    // V2 historical data

    // download v2 historical data 'csse_covid_19_time_series/time_series_covid19_confirmed_global.csv'
    const pathV2 = path.join(__dirname, 'downloads', `${category}_v2.csv`);
    if (!fs.existsSync(pathV2)) {
      console.log(`Downloading V2 data ${pathV2}`)
      const file = fs.createWriteStream(pathV2);
      await api.fetchDataHistoricalV2(category, file);
    }

  }

  // determine how many days since 3/23/2020 (inclusive), that is the day the data format changed from v1 -> v2
  const dataFormatV2StartDate = moment.utc('2020-03-23T00:00:00Z');
  const daysSinceDataFormatV2 = Number(dateToday.diff(dataFormatV2StartDate, 'days'));

  //
  if (daysSinceDataFormatV2 >= 1) {
    console.log('It has been ', daysSinceDataFormatV2, 'days since V2 (2020-03-24)')
    console.log(`Catching up daily reports, if needed`);

    /**
      We need to download individual daily reports for each day from 2020-03-22 (inclusive)
      in order to pick up historical data for regions (i.e. state and county level).

      This is because the current V2 data format for timeseries in:
      /csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv
      /csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Deaths.csv

      ...only includes country level data, not any regional data.
      To get the regional data, we must "catch up" the V1 file by looking at all daily report files one by one
    **/
    const startDateV2 = moment.utc(dataFormatV2StartDate.toISOString());

    for (let i = 0; i < daysSinceDataFormatV2; i++){
      const remoteFileName = `${startDateV2.format('MM-DD-YYYY')}.csv`;
      const localFilePath = path.join(__dirname, 'downloads', 'daily-reports', `Catch_Up_Report_${startDateV2.format('YYYY-MM-DD')}.csv`);

      if (!fs.existsSync(localFilePath)) {
        console.log(`Downloading https://raw.githubusercontent.com/CSSEGISandData/2019-nCoV/master/csse_covid_19_data/csse_covid_19_daily_reports/${remoteFileName} to ${localFilePath}`);
        const fileStream = fs.createWriteStream(localFilePath);
        await api.fetchDataDailyReport(remoteFileName, fileStream);
      }
      startDateV2.add(1, 'day');
    }

  }

  console.log('Done');
  console.log();

}

async function getTodayData () {
  console.log();
  console.log(`Today's Data`);
  console.log('------------');
  try {
    console.log(`Fetching today's latest ${categories.join(', ')} by country and region...`);
    todayData = await api.fetchDataToday();

    // const foo = todayData.features.filter(item => item.attributes.Country_Region === 'US')
    // console.info(foo)
  } catch (err) {
    console.error(err)
  }
}

function parseTodayData(country) {
  let countryDataToday;

  if (country === 'US'){

    const countryRegions = todayData.features.filter(item => item.attributes.Country_Region === 'US');
    let countConfirmed = 0;
    let countDeaths = 0;
    for(regionFeature of countryRegions){
      countConfirmed += regionFeature.attributes['Confirmed'];
      countDeaths += regionFeature.attributes['Deaths'];
    }
    countryDataToday = {
      'Confirmed': countConfirmed,
      'Deaths': countDeaths,
    };

  } else {

    const countryFeature = todayData.features.find(item => {
      return item.attributes.Country_Region === country && item.attributes.Province_State === null;
    });
    countryDataToday = {
      'Confirmed': countryFeature.attributes['Confirmed'],
      'Deaths': countryFeature.attributes['Deaths'],
    };
  }

  return countryDataToday;
}

const prepareReportData = async() => {

  console.log()
  console.log('Prepare report data...')

  const response = {
    lastUpdate: Date.now().toString(),
    timeseriesDays: [],
    timeseries: []
  };

  // get days since V1

  let updateTodayMode = 'replace';
  let columns = [];
  for (country of options.countries) {

    const countryDataObject = {
      country,
      timeseriesByCategory: {
        'Confirmed': [],
        'Deaths': [],
      },
    }

    const categories = ['Confirmed', 'Deaths'];

    // start with historical data, then add today's data at the very end to bring the last day's numbers up to date
    for (category of categories) {
      // use historical data to prepare response object, keyed by country
      const {rows: allRows, columns: allColumns} = await csvParser.readGlobalCategoryDatafile(country, category, 'v2');
      if (!columns.length){
        const [columnRegion, columnCountry, columnLat, columnLong, ...restOfColumns] = allColumns;
        columns = restOfColumns;
      }

      let rows = allRows;
      // if (country === 'US') {
      //   // for US rows, filter out rows that aren't states so we don't overcount redundant tallies
      //   rows = rows.filter(item => !item[0] || Object.values(regionsUSA).includes(item[0]));
      //   console.log(rows.length, 'rows left after filter')
      //   // console.log(columns)
      // }

      if (options.splitByRegion) {

        // if we are not showing breakdown by region, then the historical data
        // is a complete record up until the present day

        // use historical data to prepare response object, keyed by region

        const countryDataObject = {
          country: undefined,
          region: undefined,
          timeseriesByCategory: {},
        }

        let countryCategoryTimeseries = [];
        for(const row of rows){
          const [region, countryCode, lat, long, ...rowTimeseries] = row;

          rowTimeseries.pop();
          if (!countryCategoryTimeseries.length){
            // first row, just pass through as baseline for timeseries
            // every subsequent row will add to totals
            countryCategoryTimeseries = rowTimeseries;
            countryDataObject.country = countryCode;
            countryDataObject.timeseriesByCategory[category] = countryCategoryTimeseries.map(datum => Number(datum));
          } else {
            // every subsequent row
            rowTimeseries.forEach((dayCount, index) => {
              countryDataObject.timeseriesByCategory[category][index] += Number(dayCount);
            });
          }
        }

        console.log('done parsing')
        console.log(countryDataObject)

      } else {

        // all regions of country will be merged into one row
        let countryCategoryTimeseries = [];
        for (const row of rows) {
          const [region, countryCode, lat, long, ...rowTimeseries] = row;

          rowTimeseries.pop();
          if (!countryCategoryTimeseries.length) {
            // first row, just pass through as baseline for timeseries
            // every subsequent row will add to totals
            countryCategoryTimeseries = rowTimeseries;
            countryDataObject.country = countryCode;
            countryDataObject.timeseriesByCategory[category] = countryCategoryTimeseries.map(datum => Number(datum));
          } else {
            // every subsequent row
            rowTimeseries.forEach((dayCount, index) => {
              countryDataObject.timeseriesByCategory[category][index] += Number(dayCount);
            });
          }
        }

      }

    }

    // now catch up timeseries from today's up to the minute data
    const lastDateOfTimeseries = columns[columns.length - 1];
    const timeseriesEndDate = moment.utc(lastDateOfTimeseries, 'M/D/YY');

    // depending on what time of day we run this, we might be on the same day as the last column entry of
    // historical data, in which case we replace it
    // otherwise, we are on the next day after the end of the historical data, in which case, we append

    const diffBetweenTodayAndLatestReport = dateToday.diff(timeseriesEndDate, 'days');
    if (diffBetweenTodayAndLatestReport > 0){
      updateTodayMode = 'append';
    } else {
      updateTodayMode = 'replace';
    }

    // console.log(dateToday.diff(timeseriesEndDate, 'days'), 'days diff between today and history data', updateTodayMode)

    const countryDataToday = parseTodayData(country);

    if (updateTodayMode === 'append') {

      countryDataObject.timeseriesByCategory['Confirmed'].push(countryDataToday['Confirmed']);
      countryDataObject.timeseriesByCategory['Deaths'].push(countryDataToday['Deaths']);

    } else if (updateTodayMode === 'replace') {

      const lengthConfirmedTimeline = countryDataObject.timeseriesByCategory['Confirmed'].length;
      countryDataObject.timeseriesByCategory['Confirmed'][lengthConfirmedTimeline - 1] = countryDataToday['Confirmed'];

      const lengthDeathsTimeline = countryDataObject.timeseriesByCategory['Deaths'].length;
      countryDataObject.timeseriesByCategory['Deaths'][lengthDeathsTimeline - 1] = countryDataToday['Deaths'];

    }

    console.log('done parsing ', country, 'update mode was', updateTodayMode)
    response.timeseries.push(countryDataObject);
  }

  if (updateTodayMode === 'append') {
    // add today to the columns
    // console.log('add one day to timeseries columns')
    columns.push(dateToday.format('M/D/YY'));
  }

  response.timeseriesDays = columns;

  return response;

}

// function countTodayUSA() {
//   // generate group counts for USA
//
//   // filter number only for regions matching the known states list
//   // this is done to avoid overcounting city numbers that are redundant with state numbers
//   const states = {
//     "AL": "Alabama",
//     "AK": "Alaska",
//     "AS": "American Samoa",
//     "AZ": "Arizona",
//     "AR": "Arkansas",
//     "CA": "California",
//     "CO": "Colorado",
//     "CT": "Connecticut",
//     "DE": "Delaware",
//     "DC": "District Of Columbia",
//     "FM": "Federated States Of Micronesia",
//     "FL": "Florida",
//     "GA": "Georgia",
//     "GU": "Guam",
//     "HI": "Hawaii",
//     "ID": "Idaho",
//     "IL": "Illinois",
//     "IN": "Indiana",
//     "IA": "Iowa",
//     "KS": "Kansas",
//     "KY": "Kentucky",
//     "LA": "Louisiana",
//     "ME": "Maine",
//     "MH": "Marshall Islands",
//     "MD": "Maryland",
//     "MA": "Massachusetts",
//     "MI": "Michigan",
//     "MN": "Minnesota",
//     "MS": "Mississippi",
//     "MO": "Missouri",
//     "MT": "Montana",
//     "NE": "Nebraska",
//     "NV": "Nevada",
//     "NH": "New Hampshire",
//     "NJ": "New Jersey",
//     "NM": "New Mexico",
//     "NY": "New York",
//     "NC": "North Carolina",
//     "ND": "North Dakota",
//     "MP": "Northern Mariana Islands",
//     "OH": "Ohio",
//     "OK": "Oklahoma",
//     "OR": "Oregon",
//     "PW": "Palau",
//     "PA": "Pennsylvania",
//     "PR": "Puerto Rico",
//     "RI": "Rhode Island",
//     "SC": "South Carolina",
//     "SD": "South Dakota",
//     "TN": "Tennessee",
//     "TX": "Texas",
//     "UT": "Utah",
//     "VT": "Vermont",
//     "VI": "Virgin Islands",
//     "VA": "Virginia",
//     "WA": "Washington",
//     "WV": "West Virginia",
//     "WI": "Wisconsin",
//     "WY": "Wyoming"
//   }
//   const stateNames = Object.values(states);
//
//   let confirmed = 0;
//   let deaths = 0;
//   // let recovered = 0;
//
//   todayData.features
//     .filter(item => item.attributes.Country_Region === "US")
//     .filter(item => stateNames.includes(item.attributes.Province_State))
//     .forEach(item => {
//
//       const state = item.attributes.Province_State;
//       todayUSARegions[state] = {
//         'Confirmed': item.attributes['Confirmed'],
//         'Deaths': item.attributes['Deaths'],
//         // 'Recovered': item.attributes['Recovered'],
//       };
//
//       confirmed += item.attributes['Confirmed'];
//       deaths += item.attributes['Deaths'];
//       // recovered += item.attributes['Recovered'];
//     })
//   ;
//
//   todayUSA = {
//     'Confirmed': confirmed,
//     'Deaths': deaths,
//     // 'Recovered': recovered,
//   }
//
//
// }

// function tallyTodayCountries() {
//   todayData.features
//     .filter(item => item.attributes.Province_State === null)
//     .forEach(item => {
//       const country = item.attributes.Country_Region;
//       todayCountries[country] = {
//         'Confirmed': item.attributes['Confirmed'],
//         'Deaths': item.attributes['Deaths'],
//         // 'Recovered': item.attributes['Recovered'],
//       }
//     });
//
//   todayCountries['United States'] = todayUSA;
//   // console.log(todayCountries)
//   // console.log(todayUSARegions)
// }

const generateMenu = async() => {
  console.log('Generate Menu');
  console.log('-------------');
  // get a list of all available countries by reading the v2 global data file
  const {rows: v2Rows, columns: allColumns} = await csvParser.readGlobalCategoryDatafile(null, 'Confirmed', 'v2');

  const countries = v2Rows.filter(item => item[0] === '').map(item => item[1]);

  // get a list of all available states by reading the v1 global data file
  const {rows: v1Rows} = await csvParser.readGlobalCategoryDatafile(null, 'Confirmed', 'v1');

  const allowedStates = Object.values(regionsUSA);
  const states = v1Rows.filter(item => item[1] === 'US' && item[0] !== '' && allowedStates.includes(item[0]) ).map(item => item[0]);


  // get a list of all available counties by looking at the earliest daily report
  const {rows: dailyReportRows, columns: dailyReportColumns} = await csvParser.readDailyReport();

  const counties = dailyReportRows
    .filter(item => item[3] === 'US')
    .map(item => [item[1], item[2]]);

  const data = {
    countries,
    states,
    counties,
  };

  const pathMenuFile = path.join(__dirname, 'public', 'menu.json');
  try {
    fs.writeFileSync(pathMenuFile, JSON.stringify(data));

    //file written successfully
  } catch (err) {
    console.error(err)
  }

  console.log('Done');
  console.log();
}

const generateTimeseriesFile = async() => {

  console.log()
  console.log('Preparing Timeseries Data')
  console.log('-------------------------')

  const pathMenuFile = path.join(__dirname, 'public', 'menu.json');
  const menu = JSON.parse(fs.readFileSync(pathMenuFile, 'utf8'));
  const {countries, states, counties} = menu;

  const response = {
    lastUpdate: Date.now().toString(),
    timeseriesDays: [],
    timeseries: {
      countries: {},
      states: {},
      counties: {},
    }
  };

  const categories = ['Confirmed', 'Deaths'];
  let timeseriesDays = [];

  // populate data for countries - read from V2 file
  console.log()
  console.log('preparing timeseries data for', countries.length, 'known countries')

  // create stub record for each country
  for (country of countries){
    response.timeseries.countries[country] = {
      name: country,
      timeseriesByCategory: {},
    }
  }

  // populate timeseries from each global category (V2) file
  for (category of categories) {

    // read rows from V2 file
    const {rows: allRows, columns: allColumns} = await csvParser.readGlobalCategoryDatafile(null, category, 'v2');

    // use this opportunity to get the timeseries list, it's arbitrary which V2 file we pull it from, they're both up to date
    if (!timeseriesDays.length) {
      const [columnRegion, columnCountry, columnLat, columnLong, ...restOfColumns] = allColumns;
      timeseriesDays = restOfColumns;
    }

    // filter out non-country rows
    const countryRows = allRows.filter(item => item[0] === '');
    for(countryRow of countryRows){
      const [region, countryCode, lat, long, ...timeseries] = countryRow;
      const timeseriesNumeric = timeseries.map(item => Number(item));

      if (response.timeseries.countries[countryCode]){
        response.timeseries.countries[countryCode].timeseriesByCategory[category] = timeseriesNumeric;
      }

    }

  }

  // populate data for states
  console.log()
  console.log('preparing timeseries data for', states.length, 'known states')

  // create stub record for each state
  for (state of states){
    response.timeseries.states[state] = {
      name: state,
      timeseriesByCategory: {},
    }
  }


  // populate states timeseries from each global category (V1) file
  for (category of categories) {

    // read rows from V2 file
    const {rows: v1Rows, columns: allColumns} = await csvParser.readGlobalCategoryDatafile(null, category, 'v1');

    // filter out non-state rows
    const allowedStates = Object.values(regionsUSA);
    const stateRows = v1Rows
      .filter(item => item[1] === 'US' && item[0] !== '')
      .filter(item => allowedStates.includes(item[0]));

    for (stateRow of stateRows) {

      const [stateCode, countryCode, lat, long, ...timeseries] = stateRow;
      const timeseriesNumeric = timeseries.map(item => Number(item));

      if (response.timeseries.states[stateCode]){
        response.timeseries.states[stateCode].timeseriesByCategory[category] = timeseriesNumeric;
      }

    }

  }


  // populate data for counties
  console.log()
  console.log('preparing timeseries data for', counties.length, 'known counties')

  // create stub record for each county
  for (county of counties){
    response.timeseries.counties[county[0]] = {
      name: county[0],
      state: county[1],
      timeseriesByCategory: {
        'Confirmed': [],
        'Deaths': [],
      },
    }
  }

  // populate counties timeseries from each global category (usafacts) file
  for (category of categories) {

    // read rows from V2 file
    const {rows: usafactsRows, columns: allColumns} = await csvParser.readGlobalCategoryDatafile(null, category, 'usafacts');

    // filter out non-state rows

    const countyRows = usafactsRows;
      // .filter(item => allowedStates.includes(item[0]));

    for (countyRow of countyRows) {

      const [countyFIPS, countyNameWithCounty, stateCode, stateFIPS, ...timeseries] = countyRow;
      const timeseriesNumeric = timeseries.map(item => Number(item));

      let countyName = countyNameWithCounty.replace(' County', '');
      countyName = countyName.replace(' Parish', '');

      if (regionsUSA[stateCode]){
        const stateName = regionsUSA[stateCode]

        if (response.timeseries.counties[countyName]) {
          response.timeseries.counties[countyName].timeseriesByCategory[category] = timeseriesNumeric;
        }
      }

    }

  }

  if (true) {

    // OK, now it's time to play catch up
    // (this is the advanced stuff...)
    //
    // the historical state file (V1) only gets us thru 3/22/2020 - it contains values for day 3/23/2020 but they're all duplicates of 3/22 (?)
    // the historical county file (usafacts) only gets us thru 3/24/2020

    // Game plan:
    // loop through each daily report, starting from 3/23
    // for each report, collect each new day of data and append to the existing county timeseries
    // additionally, keep a cumulative tally of states as we visit each county, so we can also get the state rollup total as well
    // when done, update the state timeseries with the new day's count
    const directoryPath = path.join(__dirname, 'downloads', 'daily-reports');
    const dailyFiles = fs.readdirSync(directoryPath);

    // console.log(dailyFiles)

    const dailyFilesStartDate = moment.utc('2020-03-23T00:00:00Z');
    const timeseriesStartDate = moment.utc('2020-01-22T00:00:00Z');

    console.log();
    console.log('Catching up county data from daily reports...')
    console.log();

    // loop through each daily report, starting from 3/23
    for (dailyFile of dailyFiles) {

      const dateString = dailyFilesStartDate.format('YYYY-MM-DD');
      const {rows: dailyFileRows} = await csvParser.readDailyReport(dateString);

      console.log('parsing daily file ', dateString)

      const daysFromJan22 = dailyFilesStartDate.diff(timeseriesStartDate, 'days');

      const timeseriesArrayIndexToUpdate = daysFromJan22;

      const dailyRows = dailyFileRows.filter(item => item[3] === 'US');

      // use this to keep tally by for each state
      const stateTallies = {};

      // loop through each county
      for (dailyFileRow of dailyRows) {

        const [
          FIPS,
          Admin2,
          Province_State,
          Country_Region,
          Last_Update,
          Lat,
          Long_,
          Confirmed,
          Deaths,
          Recovered,
          Active,
          Combined_Key,
        ] = dailyFileRow;

        const countyConfirmedCount = Number(Confirmed);
        const countyDeathsCount = Number(Deaths);

        if (Province_State === 'California') {
          // console.log('Province_State', Province_State, Confirmed, Deaths)
        }

        if (typeof stateTallies[Province_State] === 'undefined') {
          stateTallies[Province_State] = {'Confirmed': 0, 'Deaths': 0};
        }

        // keep up state tally for later
        stateTallies[Province_State]['Confirmed'] += countyConfirmedCount;
        stateTallies[Province_State]['Deaths'] += countyDeathsCount;

        // add to county cumulative
        if (Admin2 && response.timeseries.counties[Admin2]) {
          response.timeseries.counties[Admin2].timeseriesByCategory['Confirmed'][timeseriesArrayIndexToUpdate] = countyConfirmedCount;
          response.timeseries.counties[Admin2].timeseriesByCategory['Deaths'][timeseriesArrayIndexToUpdate] = countyDeathsCount;
        }

      }

      // update the state numbers for this day using the county tallies
      Object.keys(stateTallies).forEach(stateName => {

        if (response.timeseries.states[stateName]) {
          // we will append to timeseries
          response.timeseries.states[stateName].timeseriesByCategory['Confirmed'][timeseriesArrayIndexToUpdate] = stateTallies[stateName]['Confirmed'];
          response.timeseries.states[stateName].timeseriesByCategory['Deaths'][timeseriesArrayIndexToUpdate] = stateTallies[stateName]['Deaths'];
        }
      });

      dailyFilesStartDate.add(1, 'day');
    }
  }

  // add the timeseries days
  response.timeseriesDays = timeseriesDays;

  const pathTimeseriesFile = path.join(__dirname, 'public', 'timeseries.json');
  try {
    fs.writeFileSync(pathTimeseriesFile, JSON.stringify(response));

    //file written successfully
  } catch (err) {
    console.error(err)
  }
  return;

}


// start up server
const express = require('express')
const app = express();
const port = 3000;

app.get('/menu', (req, res) => {
  getMenuOptions()
    .then((menu) => res.send(menu));
});

app.get('/report', (req, res) => {

  prepareOptions(req);

  getTodayData()
    .then(() => prepareReportData())
    .then((response) => res.send(response))

});


app.use('/', express.static(path.join(__dirname, 'public')))

// Start up
downloadHistoricalData()
  .then(() => generateMenu())
  .then(() => generateTimeseriesFile())
  .then(() => {
    // start the server
    console.log();
    app.listen(port, () => console.log(`
      Server is now ready to serve data, listening on port ${port}.
      To see charts, please open your web browser to http://localhost:3000
      
      Ctrl-C to exit server
    `));
  });



