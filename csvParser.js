const fs = require('fs');
const parse = require('csv-parse');

const delimiter = ',';
const COLUMN_KEY_REGION = 0;

exports.readLatestDateDownloaded = (category) => {
  return new Promise((resolve, reject) => {
    let columns;

    // set up the csv parser
    const parser = parse({delimiter})
      .on('readable', () => {
        let row;
        while (row = parser.read()) {
          if (!columns) {
            // first row of CSV is going to be the column titles
            columns = row;
          }
        }
      })
      .on('end', () => {
        // parser is done, return buffer
        const lastDateDownloaded = columns.pop();
        resolve(lastDateDownloaded);
      })
      .on('error', (err) => {
        console.error(err.message)
      });

    // begin reading csv
    const inputFile = `./init-data-${category}.csv`;
    fs.createReadStream(inputFile)
      .pipe(parser);


  });
}

exports.readData = (country, category, version) => {

  const inputFile = `./${category}_v${version}.csv`;

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
            if (row[1] === country){
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
    fs.createReadStream(inputFile)
      .pipe(parser);

  });

}