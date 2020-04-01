const api = require('./api');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const csvParser = require('./csvParser');
const countryPopulations = require('./downloads/country-populations.json');
const extraPopulations = require('./downloads/extra-states-populations');

const {
  regionsAustralia,
  regionsCanada,
  regionsUSA,
} = require('./constants');



const generate = async() => {

  const response = {
    countries: {},
    states: {},
    counties: {},
  };


// read in the population file
  const inputFile = `us-population2019.csv`;
  const inputFilePath = path.join(__dirname, 'downloads', inputFile);

  const {rows, columns} = await csvParser.readCsv(inputFilePath);
  console.log('read file with', rows.length, 'rows')

  // read all locations known from menu file, so we can make sure we have the names correct
  const pathMenuFile = path.join(__dirname, 'public', 'menu.json');
  const menu = JSON.parse(fs.readFileSync(pathMenuFile, 'utf8'));
  const {countries, states, counties} = menu;

  const knownCountries = countries;
  const knownCountyNames = counties.map(item => `${item[0]}, ${item[1]}`);

  const knownUSStates = Object.values(regionsUSA);
  const statesToSkip = ['District of Columbia'];

  const skipped = [];

  for (row of rows) {
    const [
      col1,
      region,
      division,
      stateId,
      countyId,
      stateName,
      countyNameWithCounty,
      census2010Pop,
      estimatesbase2010,
      popEstimate2010,
      popEstimate2011,
      popEstimate2012,
      popEstimate2013,
      popEstimate2014,
      popEstimate2015,
      popEstimate2016,
      popEstimate2017,
      popEstimate2018,
      popEstimate2019,
    ] = row;

    const population = Number(popEstimate2019);

    if (countyId === '000') {
      // this is a state, not a county
      if (knownUSStates.includes(stateName) && !statesToSkip.includes(stateName)) {
        response.states[stateName] = population;

      } else {
        console.log('could not match state', stateName)
        skipped.push(stateName)
      }
    } else {

      // this is a county
      const population = Number(popEstimate2019)

      let countyName = countyNameWithCounty.replace(' County', '');
      countyName = countyName.replace(' Parish', '');
      countyName = countyName.replace(' Census Area', '');
      countyName = countyName.replace(' City and Borough', '');
      countyName = countyName.replace(' Borough', '');
      countyName = countyName.replace(' city', '');
      countyName = countyName.replace(' Municipality', '');
      countyName = countyName.replace('ñ', 'n');
      countyName = countyName.replace('�', 'n');
      countyName = countyName.replace('New York', 'New York City');

      if (knownUSStates.includes(stateName) || stateName === 'District of Columbia') {

        countyName = `${countyName}, ${stateName}`;

        if (knownCountyNames.includes(countyName)) {
          response.counties[countyName] = population;
        } else {
          console.log('could not match county', countyName)
          skipped.push(countyName)
        }

      } else {
        console.log('could not find state', stateName, 'in list')
        skipped.push(stateName)
      }
    }

  }

  // fix the remaining states
  for (extraState of extraPopulations) {
    response.states[extraState.name] = Number(extraState.population)
  }


  for (country of knownCountries){

    const populationRecord = countryPopulations.find(item => item.country === country);

    if (!populationRecord) {
      console.log('cant find population for country', country)
    } else {
      const population = Number(populationRecord.population);
      if (!population) {
        console.log('Population is missing for', country);
      } else {
        response.countries[country] = population;
      }
    }

  }

  const pathPopulationsFile = path.join(__dirname, 'public', 'populations.json');
  try {
    fs.writeFileSync(pathPopulationsFile, JSON.stringify(response));
  } catch (e) {
    console.error(e);
  }


}

generate();