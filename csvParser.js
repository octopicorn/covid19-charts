const fs = require('fs');
const path = require('path');
const parse = require('csv-parse');

const delimiter = ',';


exports.readDailyReport = (dateString) => {
  let inputFile;

  if (dateString) {
    inputFile = `Catch_Up_Report_${dateString}.csv`;
  } else {
    const directoryPath = path.join(__dirname, 'downloads', 'daily-reports');
    const files = fs.readdirSync(directoryPath);
    inputFile = files[files.length - 1];
  }

  const inputFilePath = path.join(__dirname, 'downloads', 'daily-reports', inputFile);

  return new Promise((resolve, reject) => {
    let buffer = [];
    let columns;

    // set up the csv parser
    const parser = parse({delimiter})
      .on('readable', () => {
        let row;
        while (row = parser.read()) {
          if (!columns) {
            // first row of CSV is going to be the column titles
            columns = row;
          } else {
            buffer.push(row);
          }
        }
      })
      .on('end', () => {
        // parser is done, return buffer
        resolve({rows: buffer, columns})
      })
      .on('error', (err) => {
        console.error(err.message)
      });

    // begin reading csv
    fs.createReadStream(inputFilePath)
      .pipe(parser);
  })
}

exports.readCsv = (inputFilePath) => {
  return new Promise((resolve, reject) => {
    let columns;
    let buffer = [];

    // set up the csv parser
    const parser = parse({delimiter})
      .on('readable', () => {
        let row;
        while (row = parser.read()) {
          if (!columns) {
            // first row of CSV is going to be the column titles
            columns = row;
          } else {
            buffer.push(row);
          }
        }
      })
      .on('end', () => {
        // parser is done, return buffer and columns
        resolve({rows: buffer, columns})
      })
      .on('error', (err) => {
        console.error(err.message)
      });

    // begin reading csv
    fs.createReadStream(inputFilePath)
      .pipe(parser);

  });
}

exports.readGlobalCategoryDatafile = (country, category, suffix) => {

  const inputFile = `${category}_${suffix}.csv`;
  const inputFilePath = path.join(__dirname, 'downloads', inputFile);

  return new Promise((resolve, reject) => {

    // clear buffer
    let buffer = [];

    let columns;

    // set up the csv parser
    const parser = parse({delimiter})
      .on('readable', () => {
        let row;
        while (row = parser.read()) {
          if (!columns) {
            // first row of CSV is going to be the column titles
            columns = row;
          } else {
            if (!country || !!country && row[1] === country){
              // console.log('pushing data row', row[0], row[1])
              buffer.push(row);
            }
          }
        }
      })
      .on('end', () => {
        // parser is done, return buffer
        resolve({rows: buffer, columns})
      })
      .on('error', (err) => {
        console.error(err.message)
      });

    // begin reading csv
    fs.createReadStream(inputFilePath)
      .pipe(parser);

  });

}