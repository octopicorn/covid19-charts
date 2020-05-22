const https = require('https');
const axios = require('axios');
const fs = require('fs');


exports.fetchDataToday = () => {
  const url = 'https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/Coronavirus_2019_nCoV_Cases/FeatureServer/1/query?where=1%3D1&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&resultType=none&distance=0.0&units=esriSRUnit_Meter&returnGeodetic=false&outFields=*&returnGeometry=true&featureEncoding=esriDefault&multipatchOption=xyFootprint&maxAllowableOffset=&geometryPrecision=&outSR=&datumTransformation=&applyVCSProjection=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnQueryGeometry=false&returnDistinctValues=false&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&returnZ=false&returnM=false&returnExceededLimitFeatures=true&quantizationParameters=&sqlFormat=none&f=pjson&token=';

  return new Promise((resolve, reject) => {
    axios.get(url)
      .then((res) => {
        // console.log(res.data)
        console.log('Done.');
        resolve(res.data);
      })
      .catch((error) => {
        console.error(error)
        reject();
      });
  });
}

const fetchFileByHttps = (filestream, hostname, url) => {

    return new Promise((resolve, reject) => {

      const options = {
        hostname,
        port: 443,
        path: url,
        method: 'GET',
      }

      const req = https.request(options, res => {
        // console.log(`statusCode: ${res.statusCode}`)

        res
          .on('data', data => {
            filestream.write(data);
          })
          .on('end', () => {
            filestream.end();
            console.log('Done.');
            resolve();
          });
      });

      req.on('error', error => {
        console.error(error)
        reject();
      });

      req.end();
    });


}

exports.fetchDataHistoricalV1 = (category, file) => {

  const hostname = 'raw.githubusercontent.com';
  const url = `/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-${category}.csv`;
  return fetchFileByHttps(file, hostname, url);

}

exports.fetchDataHistoricalV2 = (category, file) => {

  const hostname = 'raw.githubusercontent.com';
  const url = `/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_${category.toLowerCase()}_global.csv`;
  return fetchFileByHttps(file, hostname, url);

}

exports.fetchDataDailyReport = async (fileName, localFilePath) => {

  const url = `CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/${fileName}`;

  try {
    const response = await axios.get(`https://raw.githubusercontent.com/${url}`);
    const fileStream = fs.createWriteStream(localFilePath);
    filestream.write(response.data);
  } catch (error) {
    console.log(error.toString());
  }

}