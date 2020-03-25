const api = require('./api');
const csvParser = require('./csvParser');
const fs = require('fs');
const moment = require('moment');

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

let todayCountries = {};
let todayRegions = {};
let todayUSARegions = {};
let todayUSA = {};

const countriesOfInterest = ['US', 'Italy'];

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

const options = {
  alignToFirst100: false,
  splitByRegion: false,
};

async function downloadHistoricalData () {
  console.log('Historical Data');
  console.log('---------------');

  // for each category
  for (const category of categories) {

    // V1 historical data
    // on 3/23/2020, JH CSSE changed data format, so all data up until that date will be called V1
    // V1 timeseries is different from V2 in the following ways:
    // - no cumulative US data, all regions have to be summed together to find US totals
    // - US data tallies are shown by state, and also by county. these can be used to show regional breakdowns

    // if v1 historical data file doesn't exist, download it now
    const pathV1 = `./${category}_v1.csv`;
    if (!fs.existsSync(pathV1)) {
      // we should download if no file exists yet
      console.log(`Downloading V1 data ${pathV1}`)
      //file does not exist
      const file = fs.createWriteStream(pathV1);
      await api.fetchDataHistoricalV1(category, file);
    }

    // V2 historical data

    // download v2 historical data 'csse_covid_19_time_series/time_series_covid19_confirmed_global.csv'
    const pathV2 = `./${category}_v2.csv`;
    if (!fs.existsSync(pathV2)) {
      console.log(`Downloading V2 data ${pathV2}`)
      const file = fs.createWriteStream(pathV2);
      await api.fetchDataHistoricalV2(category, file);
    }

  }

  // determine how many days since 3/23/2020 (inclusive), that is the day the data format changed from v1 -> v2
  const dataFormatV2StartDate = moment.utc('2020-03-24T00:00:00Z');
  const daysSinceDataFormatV2 = Number(dateToday.diff(dataFormatV2StartDate, 'days'));
  console.log('it has been ', daysSinceDataFormatV2, 'days since V2 (2020-03-24)')

  //
  if (options.splitByRegion && daysSinceDataFormatV2 >= 1) {

    console.log(`Catching up regional data from daily reports, if needed`);

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
      const localFilePath = `./Catch_Up_Report_${startDateV2.format('YYYY-MM-DD')}.csv`;

      if (!fs.existsSync(localFilePath)) {
        console.log(`Downloading https://raw.githubusercontent.com/CSSEGISandData/2019-nCoV/master/csse_covid_19_data/csse_covid_19_daily_reports/${remoteFileName} to ${localFilePath}`);
        const fileStream = fs.createWriteStream(localFilePath);
        await api.fetchDataDailyReport(remoteFileName, fileStream);
      }
      startDateV2.add(1, 'day');
    }

  }


  try {
    let shouldDownload = false;

      // daily totals are reported once per day in historical data files
      // we should download if file exists but is more than 24hrs out of date
      // try {
      //   const lastDateDownloaded = await csvParser.readLatestDateDownloaded(category);
      //   const dateLastDownload = new Date(lastDateDownloaded);
      //
      //   // check if last download is greater than one day old
      //   if (dateLastDownload.getTime() < (dateToday.getTime() - oneDayLengthMilliseconds)) {
      //     console.log(`${category} historical data out of date, last day downloaded was ${lastDateDownloaded}.`);
      //     shouldDownload = true;
      //   }
      //
      // } catch (e) {
      //   console.log(e)
      // }


    // if (shouldDownload) {
    //   console.log(`Downloading ${category} historical data.`);
    //   //file does not exist
    //   var file = fs.createWriteStream(path);
    //   await api.fetchDataHistorical(category, file);
    //   console.log('Done.')
    // } else {
    //   console.log(`${category} historical already downloaded.`);
    // }
  } catch (err) {
    console.error(err)
  }



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
    timelineDays: [],
    data: {

    }
  };

  // get days since V1

  let updateTodayMode = 'replace';
  let columns = [];
  for (country of countriesOfInterest) {

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
      const {rows: allRows, columns: allColumns} = await csvParser.readData(country, category, 2);
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

    response.data[country] = countryDataObject;
  }

  if (updateTodayMode === 'append') {
    // add today to the columns
    // console.log('add one day to timeseries columns')
    columns.push(dateToday.format('M/D/YY'));
  }

  response.timelineDays = columns;

  Object.keys(response.data).forEach(key => {

    console.info(response.data[key])
  })

}

function countTodayUSA() {
  // generate group counts for USA

  // filter number only for regions matching the known states list
  // this is done to avoid overcounting city numbers that are redundant with state numbers
  const states = {
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
  const stateNames = Object.values(states);

  let confirmed = 0;
  let deaths = 0;
  // let recovered = 0;

  todayData.features
    .filter(item => item.attributes.Country_Region === "US")
    .filter(item => stateNames.includes(item.attributes.Province_State))
    .forEach(item => {

      const state = item.attributes.Province_State;
      todayUSARegions[state] = {
        'Confirmed': item.attributes['Confirmed'],
        'Deaths': item.attributes['Deaths'],
        // 'Recovered': item.attributes['Recovered'],
      };

      confirmed += item.attributes['Confirmed'];
      deaths += item.attributes['Deaths'];
      // recovered += item.attributes['Recovered'];
    })
  ;

  todayUSA = {
    'Confirmed': confirmed,
    'Deaths': deaths,
    // 'Recovered': recovered,
  }


}

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




downloadHistoricalData()
  .then(() => getTodayData())
  .then(() => console.log('\nData update complete, generating report.'))
  .then(() => prepareReportData())
  // .then(() => countTodayUSA())
  // .then(() => tallyTodayCountries())





