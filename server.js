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
moment.prototype.snapToDayEnd = function(){
  this.set('hour', 23)
    .set('minute', 59)
    .set('second', 59)
    .set('millisecond', 0);
  return this;
}

// determine today's date in UTC, snap to beginning of day at 00:00:00.000 UTC
const dateToday = moment.utc()
  .snapToDayStart();
console.log('date today UTC is ', dateToday.format('YYYY-MM-DD'), '\n')

const categories = ['Confirmed', 'Deaths', 'Recovered'];

let todayData = [];

const options = {
  alignToFirst100: false,
  splitByRegion: false,
  countries: [],
  regions: [],
  subregions: [],
};

const {
  regionsAustralia,
  regionsCanada,
  regionsUSA,
} = require('./constants');

function prepareOptions (req) {

  console.log('querystring', req.query)

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
        console.log('-------------------------------------')
        console.log('remote file: ', remoteFileName)
        console.log(`Downloading https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/${remoteFileName} to ${localFilePath}`);
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
    const todayResponse = await api.fetchDataToday();
    return todayResponse;
    // const foo = todayData.features.filter(item => item.attributes.Country_Region === 'US')
    // console.info(foo)
  } catch (err) {
    console.error(err)
  }
}

const prepareTodayReportResponse = async(todayResponse) => {

  console.log()
  console.log('Prepare report data...')

  // read in the menu.json file
  const menuPath = path.join(__dirname, 'public', 'menu.json');
  var menuJSON = fs.readFileSync(menuPath, 'utf8');
  const menu = JSON.parse(menuJSON);

  // read in the timeseries.json file
  const timeseriesPath = path.join(__dirname, 'public', 'timeseries.json');
  var timeseriesJSON = fs.readFileSync(timeseriesPath, 'utf8');
  const timeseries = JSON.parse(timeseriesJSON);
  const {timeseriesDays} = timeseries;

  // depending on what time of day we run this, we might be on the same day as the last column entry of
  // historical data, in which case we replace it
  // otherwise, we are on the next day after the end of the historical data, in which case, we append
  const lastDateOfTimeseries = timeseriesDays[timeseriesDays.length - 1];
  // assume end of reported historical timeseries is end of day in UTC on the date of last element in timeseries dates
  const timeseriesEndDate = moment.utc(lastDateOfTimeseries, 'M/D/YY').snapToDayEnd();

  let timeseriesIndexToUpdate;
  const currentDateTime = moment.utc(); // get current date tiem in UTC
  // how many hours have passed since the last automated report?
  const diffBetweenTodayAndLatestReport = currentDateTime.diff(timeseriesEndDate, 'hours');

  // if it's been an hour or more since the last report, we will append
  if (diffBetweenTodayAndLatestReport > 1){
    // we will append one more element to timeseries
    timeseriesIndexToUpdate = timeseriesDays.length;
  } else {
    // we will replace the last element of timeseries
    timeseriesIndexToUpdate = timeseriesDays.length - 1;
  }

  const response = {
    lastUpdate: moment.utc().toISOString(),
    timeseriesIndexToUpdate,
    timeseriesDays,
    timeseries: {
      countries: {},
      states: {},
    },
  };

  // here we have the same problem as before with generate timeseries:
  // for US, Canada, Australia, China there are only state and province numbers, not total rollup numbers for those countries
  // so we will need to tally them as we loop
  const countriesToBeTallied = ['Canada', 'Australia', 'China'];

  // the ESRI payload only contains updated info for country and state/province, not county
  for (country of menu.countries) {

    if (countriesToBeTallied.includes(country)) {

      let countryTallyConfirmed = 0;
      let countryTallyRecovered = 0;
      let countryTallyDeaths = 0;

      // loop through and collect states for each
      const stateRows = todayResponse.features
        .filter(item => item.attributes.Country_Region === country && item.attributes.Province_State !== null);
      for (stateRow of stateRows) {

        const stateName = stateRow.attributes.Province_State;

        response.timeseries.states[stateName] = {
          timeseriesByCategory: {
            ['Confirmed']: stateRow.attributes['Confirmed'],
            ['Recovered']: stateRow.attributes['Recovered'],
            ['Deaths']: stateRow.attributes['Deaths']
          },
        };

        // also keep a running sum of the country
        countryTallyConfirmed += stateRow.attributes['Confirmed'];
        countryTallyRecovered += stateRow.attributes['Recovered'];
        countryTallyDeaths += stateRow.attributes['Deaths'];
      }

      // after done looping through state/province, we now have country count
      response.timeseries.countries[country] = {
        timeseriesByCategory: {
          ['Confirmed']: countryTallyConfirmed,
          ['Recovered']: countryTallyRecovered,
          ['Deaths']: countryTallyDeaths,
        },
      };

    } else {

      // just collect the country data point

      const countryRow = todayResponse.features.find(item => item.attributes.Country_Region === country && item.attributes.Province_State === null);

      response.timeseries.countries[country] = {
        timeseriesByCategory: {
          ['Confirmed']: countryRow.attributes['Confirmed'],
          ['Recovered']: countryRow.attributes['Recovered'],
          ['Deaths']: countryRow.attributes['Deaths']
        },
      };
    }

  }

  return response;

}

const generateMenu = async() => {
  console.log('Generate Menu');
  console.log('-------------');
  // get a list of all available countries by reading the v2 global data file
  const {rows: v2Rows, columns: allColumns} = await csvParser.readGlobalCategoryDatafile(null, 'Confirmed', 'v2');

  const countries = v2Rows.filter(item => item[0] === '').map(item => item[1]);

  // Australia has to be manually added
  // why? because JH V2 report does not have a single row with rollup of Australia data
  // find Colombia and insert right before
  const indexToInsertAustralia = countries.findIndex(item => item === 'Austria');
  countries.splice(indexToInsertAustralia, 0, 'Australia');

  // Canada has to be manually added
  // why? because JH V2 report does not have a single row with rollup of Canada data
  // find Colombia and insert right before
  const indexToInsertCanada = countries.findIndex(item => item === 'Central African Republic');
  countries.splice(indexToInsertCanada, 0, 'Canada');

  // china has to be manually added
  // why? because JH V2 report does not have a single row with rollup of China data
  // find Colombia and insert right before
  const indexToInsertChina = countries.findIndex(item => item === 'Colombia');
  countries.splice(indexToInsertChina, 0, 'China');

  // get a list of all available states by reading the v1 global data file
  const {rows: v1Rows} = await csvParser.readGlobalCategoryDatafile(null, 'Confirmed', 'v1');

  const allowedAustraliaProvinces = Object.values(regionsAustralia);
  const australiaProvinces = v1Rows.filter(item => item[1] === 'Australia' && item[0] !== '' && allowedAustraliaProvinces.includes(item[0]) ).map(item => item[0]);
  const allowedCanadaProvinces = Object.values(regionsCanada);
  const canadaProvinces = v1Rows.filter(item => item[1] === 'Canada' && item[0] !== '' && allowedCanadaProvinces.includes(item[0]) ).map(item => item[0]);
  const allowedStates = Object.values(regionsUSA);
  const USstates = v1Rows.filter(item => item[1] === 'US' && item[0] !== '' && allowedStates.includes(item[0]) ).map(item => item[0]);

  const states = USstates.concat(canadaProvinces, australiaProvinces);

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

  const categories = ['Confirmed', 'Deaths', 'Recovered'];
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
  // create stub record for each state
  for (state of states){
    response.timeseries.states[state] = {
      name: state,
      timeseriesByCategory: {
        'Recovered': [...Array(timeseriesDays.length).keys()].map((item) => 0),
      },
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


    // Australia is a special case
    // there is no single row in the V2 report for Australia as a whole
    // as a result, we have to tally up the provinces in Australia for that country's total :\
    const australiaProvinceRows = allRows.filter(item => item[0] !== '' && item[1] === 'Australia');
    let australiaTimeseries; // start undefined
    for(const australiaProvinceRow of australiaProvinceRows) {
      const [region, countryCode, lat, long, ...timeseries] = australiaProvinceRow;
      const timeseriesNumeric = timeseries.map(item => Number(item));

      if (!australiaTimeseries) {
        // use the first row to initialize the baseline timeseries
        australiaTimeseries = timeseriesNumeric;
      } else {
        // every subsequent row, just add to to the baseline row
        timeseriesNumeric.forEach((item, index) => australiaTimeseries[index] += item);
      }

      if (category === 'Recovered') {
        if (response.timeseries.states[region]) {
          response.timeseries.states[region].timeseriesByCategory[category] = timeseriesNumeric;
        }
      }

    }
    if (response.timeseries.countries['Australia']){
      response.timeseries.countries['Australia'].timeseriesByCategory[category] = australiaTimeseries;
    }

    // Canada is a special case
    // there is no single row in the V2 report for Canada as a whole
    // as a result, we have to tally up the provinces in Canada for that country's total :\
    const canadaProvinceRows = allRows.filter(item => item[0] !== '' && item[1] === 'Canada');
    let canadaTimeseries; // start undefined
    for(const canadaProvinceRow of canadaProvinceRows) {

      const [region, countryCode, lat, long, ...timeseries] = canadaProvinceRow;
      const timeseriesNumeric = timeseries.map(item => Number(item));

      if (!canadaTimeseries) {
        // use the first row to initialize the baseline timeseries
        canadaTimeseries = timeseriesNumeric;
      } else {
        // every subsequent row, just add to to the baseline row
        timeseriesNumeric.forEach((item, index) => canadaTimeseries[index] += item);
      }


    }
    if (response.timeseries.countries['Canada']){
      response.timeseries.countries['Canada'].timeseriesByCategory[category] = canadaTimeseries;
    }

    if (category === 'Recovered') {
      const canadaCountryRow = allRows.find(item => item[1] === 'Canada');
      const [region, countryCode, lat, long, ...timeseries] = canadaCountryRow;
      const timeseriesNumeric = timeseries.map(item => Number(item));
      if (response.timeseries.countries['Canada']) {
        response.timeseries.countries['Canada'].timeseriesByCategory[category] = timeseriesNumeric;
      }
    }

    // China is a special case
    // there is no single row in the V2 report for China as a whole
    // as a result, we have to tally up the provinces in China for that country's total :\
    const chinaProvinceRows = allRows.filter(item => item[0] !== '' && item[1] === 'China');
    let chinaTimeseries; // start undefined
    for(const chinaProvinceRow of chinaProvinceRows) {
      const [region, countryCode, lat, long, ...timeseries] = chinaProvinceRow;
      const timeseriesNumeric = timeseries.map(item => Number(item));

      if (!chinaTimeseries) {
        // use the first row to initialize the baseline timeseries
        chinaTimeseries = timeseriesNumeric;
      } else {
        // every subsequent row, just add to to the baseline row
        timeseriesNumeric.forEach((item, index) => chinaTimeseries[index] += item);
      }

      if (category === 'Recovered') {
        if (response.timeseries.states[region]) {
          response.timeseries.states[region].timeseriesByCategory[category] = timeseriesNumeric;
        }
      }
    }

    if (response.timeseries.countries['China']){
      response.timeseries.countries['China'].timeseriesByCategory[category] = chinaTimeseries;
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


  // populate states timeseries from each global category (V1) file
  for (category of categories) {

    if (category === 'Recovered') {
      // there is no V1 file for recovered
      break;
    }

    // read rows from V2 file
    const {rows: v1Rows, columns: allColumns} = await csvParser.readGlobalCategoryDatafile(null, category, 'v1');

    // filter out non-state rows
    const allowedStates = Object.values(regionsUSA);
    const USStateRows = v1Rows
      .filter(item => item[1] === 'US' && item[0] !== '')
      .filter(item => allowedStates.includes(item[0]));

    const allowedAustraliaProvinces = Object.values(regionsAustralia);
    const australiaProvinceRows = v1Rows
      .filter(item => item[1] === 'Australia' && item[0] !== '')
      .filter(item => allowedAustraliaProvinces.includes(item[0]));

    const allowedCanadaProvinces = Object.values(regionsCanada);
    const canadaProvinceRows = v1Rows
      .filter(item => item[1] === 'Canada' && item[0] !== '')
      .filter(item => allowedCanadaProvinces.includes(item[0]));

    const stateRows = USStateRows.concat(canadaProvinceRows, australiaProvinceRows);

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
    const countyFullName = `${county[0]}, ${county[1]}`;
    response.timeseries.counties[countyFullName] = {
      name: county[0],
      state: county[1],
      timeseriesByCategory: {
        'Confirmed': [],
        'Deaths': [],
        'Recovered': [...Array(timeseriesDays.length).keys()].map((item) => 0),
        'Active': [...Array(timeseriesDays.length).keys()].map((item) => 0),
      },
    }
  }

  // populate counties timeseries from each global category (usafacts) file
  for (category of categories) {


    if (category === 'Recovered') {
      // there is no usafacts file for county recovered
      break;
    }

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
        countyName = `${countyName}, ${stateName}`;

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
    const dailyFiles = fs.readdirSync(directoryPath).filter(item => item.indexOf('.csv') > -1);

    // console.log(dailyFiles)

    const dailyFilesStartDate = moment.utc('2020-03-23T00:00:00Z');
    const timeseriesStartDate = moment.utc('2020-01-22T00:00:00Z');

    console.log();
    console.log('Catching up county data from daily reports...')
    console.log();

    // loop through each daily report, starting from 3/23
    for (dailyFile of dailyFiles) {

      const dateString = dailyFilesStartDate.format('YYYY-MM-DD');
      console.log('parsing daily file ', dateString)
      const {rows: dailyFileRows} = await csvParser.readDailyReport(dateString);

      const daysFromJan22 = dailyFilesStartDate.diff(timeseriesStartDate, 'days');

      const timeseriesArrayIndexToUpdate = daysFromJan22;

      const dailyRows = dailyFileRows.filter(item => item[3] === 'US' || item[3] === 'Canada' || item[3] === 'Australia');

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
        const countyRecoveredCount = Number(Recovered);

        // for US counties, keep a state tally
        if (Country_Region === 'US') {

          if (typeof stateTallies[Province_State] === 'undefined') {
            stateTallies[Province_State] = {'Confirmed': 0, 'Deaths': 0, 'Recovered': 0};
          }

          // keep up state tally for later
          stateTallies[Province_State]['Confirmed'] += countyConfirmedCount;
          stateTallies[Province_State]['Deaths'] += countyDeathsCount;
          // daily reports do not currently update recovered
          // stateTallies[Province_State]['Recovered'] += countyRecoveredCount;

          const countyName = `${Admin2}, ${Province_State}`;

          // add to county cumulative
          if (Admin2 && response.timeseries.counties[countyName]) {
            response.timeseries.counties[countyName].timeseriesByCategory['Confirmed'][timeseriesArrayIndexToUpdate] = countyConfirmedCount;
            response.timeseries.counties[countyName].timeseriesByCategory['Deaths'][timeseriesArrayIndexToUpdate] = countyDeathsCount;
          }
        } else if (Country_Region === 'Australia') {

          const allowedAustraliaProvinces = Object.values(regionsAustralia);
          // add to county cumulative
          if (Province_State && allowedAustraliaProvinces.includes(Province_State) && response.timeseries.states[Province_State]) {
            response.timeseries.states[Province_State].timeseriesByCategory['Confirmed'][timeseriesArrayIndexToUpdate] = countyConfirmedCount;
            response.timeseries.states[Province_State].timeseriesByCategory['Deaths'][timeseriesArrayIndexToUpdate] = countyDeathsCount;
          }

        } else if (Country_Region === 'Canada') {

          const allowedCanadaProvinces = Object.values(regionsCanada);
          // add to county cumulative
          if (Province_State && allowedCanadaProvinces.includes(Province_State) && response.timeseries.states[Province_State]) {
            response.timeseries.states[Province_State].timeseriesByCategory['Confirmed'][timeseriesArrayIndexToUpdate] = countyConfirmedCount;
            response.timeseries.states[Province_State].timeseriesByCategory['Deaths'][timeseriesArrayIndexToUpdate] = countyDeathsCount;
          }

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


app.get('/today', (req, res) => {

  prepareOptions(req);

  getTodayData()
    .then(prepareTodayReportResponse)
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
