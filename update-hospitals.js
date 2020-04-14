
const fs = require('fs');
const path = require('path');
const axios = require('axios')
const moment = require('moment');
const csvParser = require('./csvParser');

const {regionsUSA} = require('./constants');

const apiGet = async (url) => {
  return new Promise((resolve, reject) => {
    axios.get(url)
      .then((res) => {
        // console.log(res.data)
        // console.log('Done.');
        resolve(res.data);
      })
      .catch((error) => {
        console.error(error)
        reject();
      });
  });
}

const stripAddress = (address) => {
  if (!address) {
    return address;
  }
  let result = address.toUpperCase();
  result = result.replace('STREET', 'ST')
  result = result.replace('AVENUE', 'AVE')
  result = result.replace('DRIVE', 'DR')
  result = result.replace('ROAD', 'RD')
  result = result.replace('LANE', ' LN')
  result = result.replace('NORTH', 'N')
  result = result.replace('NORTHEAST', 'NE')
  result = result.replace('EAST', 'E')
  result = result.replace('NORTHWEST', 'NW')
  result = result.replace('WEST', 'W')
  result = result.replace('SOUTHWEST', 'SW')
  result = result.replace('SOUTH', 'S')
  result = result.replace('SOUTHEAST', 'SE')
  result = result.replace('TENTH', '10TH')
  result = result.replace('ELEVENTH', '11TH')
  result = result.replace('TWELFTH', '12TH')
  result = result.replace('THIRTEENTH', '13TH')
  result = result.replace('FOURTEENTH', '14TH')
  result = result.replace('FIFTEENTH', '15TH')
  result = result.replace('HIGHWAY', 'HWY')
  result = result.replace('PARKWAY', 'PKWY')
  result = result.replace('SAINT', 'ST.')

  return result;
}


const generateHospitalMappingReferenceFile = async() => {
  const pathGoogleHospitals = path.join(__dirname, 'downloads', 'hospitals', `hospital-capacity-google.csv`);
  console.log(`Opening hospital data from google sheet: ${pathGoogleHospitals}`)

  // metricGroupingColumns in the google doc = row 1
  // it is not an actual list of columns, but rather a higher level "grouping" of column metrics
  const {rows: googleRows, columns: metricGroupingColumns} = await csvParser.readCsv(pathGoogleHospitals);

  // the actual "column headers" row is row 2. extract it from the rows collection
  const googleColumns = googleRows.shift();
  console.log(googleColumns);

  // let spreadsheetRows = googleRows.filter(item => !item[0]);
  let spreadsheetRows = googleRows;


  const rowsMatched = [];
  const rowsUnmatched = [];

  const result = {

  }
  // for (row of rows) {
  //
  // }

  const stateKeys = Object.keys(regionsUSA);
  for (stateKey of stateKeys) {



    const stateName = regionsUSA[stateKey];
    const spreadsheetRowsState = spreadsheetRows.filter(item => item[7] === stateKey);

    if (spreadsheetRowsState.length) {

      console.log('Processing state:', stateKey);

      const arcgisUrl = `https://services7.arcgis.com/LXCny1HyhQCUSueu/arcgis/rest/services/Definitive_Healthcare_USA_Hospital_Beds/FeatureServer/0/query?f=json&where=STATE_NAME%20%3D%20%27${stateName}%27&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=*&orderByFields=COUNTY_NAME%20asc,HQ_CITY%20asc&resultOffset=0&resultRecordCount=1000&cacheHint=true`;

      const arcgisData = await apiGet(arcgisUrl);

      // for (row of spreadsheetRowsState){
      //   console.log(`[${row[10].toUpperCase()}] [${row[11].toUpperCase()}]`)
      // }
      // const fooIndex = spreadsheetRowsState.findIndex(item => item[11].toUpperCase() === '1001 Potrero Ave'.toUpperCase())
      // console.log('RESULT OF SEARCH', fooIndex)

      // return;

      console.log('total spreadsheet rows for ', stateKey, spreadsheetRowsState.length)
      console.log('total arcgis rows for ', stateKey, arcgisData.features.length)

      if (arcgisData.features.length) {
        console.log('Parsing state rows...')

        for (stateHospitalData of arcgisData.features) {
          const stateHospital = stateHospitalData.attributes;

          // we will add one entry to the results object for each hospital from Definitive Health arcgis layer
          const {OBJECTID, HOSPITAL_NAME, HQ_ADDRESS, HQ_CITY, COUNTY_NAME} = stateHospital;


          // try to match with google doc by hospital name
          let foundSpreadsheetMatch;
          let foundSpreadsheetMatchIndex;
          // 7 state
          // 8 county
          // 9 city
          // 10 name
          // 11 address1
          // 12 phone
          // 13 OBJECTID

          // try to match on name
          if (OBJECTID === 544) {
            // console.log('Comparing [',stripAddress(HQ_ADDRESS),'] and [', HOSPITAL_NAME.toUpperCase())
          }

          // try to match by objectid
          foundSpreadsheetMatchIndex = spreadsheetRows.findIndex(item => item[13] === OBJECTID.toString())

          if (!(foundSpreadsheetMatchIndex >= 0)) {
            // if can't match by ID, try hospital name

            foundSpreadsheetMatchIndex = spreadsheetRows.findIndex(item => item[10].toUpperCase() === HOSPITAL_NAME.toUpperCase())

            // if (OBJECTID === 5160) {
            //   console.log('************* Looking for ')
            //   const fooIndex = spreadsheetRows.findIndex(item => item[10].toUpperCase() === 'Bryce Hospital'.toUpperCase());
            //   console.log('************* result', fooIndex)
            // }
          }
          if (!(foundSpreadsheetMatchIndex >= 0)) {
            // if can't match by name, try address
            foundSpreadsheetMatchIndex = spreadsheetRows.findIndex(item => stripAddress(item[11]) === stripAddress(HQ_ADDRESS))
          }

          if (foundSpreadsheetMatchIndex >= 0) {
            // console.log('FOUND MATCH', foundSpreadsheetMatchIndex, spreadsheetRows[foundSpreadsheetMatchIndex][10])
            stateHospital.SPREADSHEET_ROW = foundSpreadsheetMatchIndex + 3;
            rowsMatched.push(stateHospital)

          } else {
            // console.log('------------------------------------------------')
            // console.log(OBJECTID, HOSPITAL_NAME, stripAddress(HQ_ADDRESS), HQ_CITY, COUNTY_NAME)
            // console.log('no match *************************')
            rowsUnmatched.push(stateHospital)
            // console.log(stateHospital)
          }
        }
      }

    }
  }

  console.log ('Matched:', rowsMatched.length)
  console.log ('Unmatched:', rowsUnmatched.length)

  const sortFunction = function (a, b) {
    if (a.SPREADSHEET_ROW < b.SPREADSHEET_ROW) {
      return -1;
    }
    if (a.SPREADSHEET_ROW > b.SPREADSHEET_ROW) {
      return 1;
    }
    // a must be equal to b
    return 0;
  }

  rowsMatched.sort(sortFunction);
  // rowsUnmatched.sort(sortFunction);

  const pathMatchedFile = path.join(__dirname, 'public', 'hospitals', 'matched.json');
  try {
    fs.writeFileSync(pathMatchedFile, JSON.stringify(rowsMatched));
  } catch (e) {
    console.error(e);
  }

  const pathUnmatchedFile = path.join(__dirname, 'public', 'hospitals', 'unmatched.json');
  try {
    fs.writeFileSync(pathUnmatchedFile, JSON.stringify(rowsUnmatched));
  } catch (e) {
    console.error(e);
  }
};

// this method was only used locally to generate the initial file: hospitals-reference.json
generateHospitalMappingReferenceFile();