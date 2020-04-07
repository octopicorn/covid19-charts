'use strict';

const statesUSA = {
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
  "FL": "Florida",
  "GA": "Georgia",
  "HI": "Hawaii",
  "ID": "Idaho",
  "IL": "Illinois",
  "IN": "Indiana",
  "IA": "Iowa",
  "KS": "Kansas",
  "KY": "Kentucky",
  "LA": "Louisiana",
  "ME": "Maine",
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
  "OH": "Ohio",
  "OK": "Oklahoma",
  "OR": "Oregon",
  "PA": "Pennsylvania",
  "PR": "Puerto Rico",
  "RI": "Rhode Island",
  "SC": "South Carolina",
  "SD": "South Dakota",
  "TN": "Tennessee",
  "TX": "Texas",
  "UT": "Utah",
  "VT": "Vermont",
  "VA": "Virginia",
  "WA": "Washington",
  "WV": "West Virginia",
  "WI": "Wisconsin",
  "WY": "Wyoming"
}


/**
 * Rule of thumb: Keep It Simple
 * using React in the simplest possible way here
 */
class HospitalsApp extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedState: 'California',
      results: [],
      sortColumn: 'ADULT_ICU_BEDS',
      sortAsc: true,
    };
  }

  fetchResultsByState = (stateCode) => {
    console.log('fetching data for', stateCode)
    // create a new XMLHttpRequest
    const xhr = new XMLHttpRequest()
    // get a callback when the server responds
    xhr.addEventListener('load', () => {
      // update the state of the component with the result here
      const parseResponse = JSON.parse(xhr.responseText);
      this.setState({results: parseResponse.features}, () => this.onSort(this.state.sortColumn));
    })
    // open the request with the verb and the url
    xhr.open('GET', `https://services7.arcgis.com/LXCny1HyhQCUSueu/arcgis/rest/services/Definitive_Healthcare_USA_Hospital_Beds/FeatureServer/0/query?f=json&where=STATE_NAME%20%3D%20%27${stateCode}%27&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=*&orderByFields=NUM_LICENSED_BEDS%20desc&resultOffset=0&resultRecordCount=1000&cacheHint=true`)
    // send the request
    xhr.send()

  }

  onSelectState = (e) => {
    // e.preventDefault();
    const state = e.target.value;
    console.log('selected state', state)
    this.fetchResultsByState(state);
  }

  renderColumn = (column) => {
    const {sortAsc, sortColumn} = this.state;
    let icon;
    if (column === sortColumn) {
      const faImage = sortAsc ? 'fa-sort-up' : 'fa-sort-down';
      icon = <i className={`fa ${faImage}`}></i>;
    } else {
      icon = <span></span>
    }
    return <th onClick={() => this.onSort(column)}>
      <div style={{display: 'flex'}}>
        <div style={{width: 15}}>{icon}</div>
        <div>{column}</div>
      </div>
    </th>
  }

  componentDidMount() {
    const {selectedState} = this.state;
    this.fetchResultsByState(selectedState);
  }

  onSort = (column) => {
    const newResults = [...this.state.results];

    const {sortAsc, sortColumn} = this.state;

    let newSortAsc = sortAsc;
    if (column === sortColumn) {
      newSortAsc = !newSortAsc;
    }

    newResults.sort(function (inputA, inputB) {
      let a;
      let b;

      console.log('sorting', inputA.attributes[column])

      if (typeof inputA.attributes[column] === 'string') {
        a = inputA.attributes[column].toLowerCase();
      } else {
        a = inputA.attributes[column];
      }

      if (typeof inputB.attributes[column] === 'string') {
        b = inputB.attributes[column].toLowerCase();
      } else {
        b = inputB.attributes[column];
      }


      if (a < b) {
        return newSortAsc ? -1 : 1;
      }
      if (a > b) {
        return newSortAsc ? 1 : -1;
      }
      // a must be equal to b
      return 0;
    })

    this.setState({
      results: newResults,
      sortColumn: column,
      sortAsc: newSortAsc,
    });

  }

  render() {

    const {results, selectedState} = this.state;


    if (!results) {
      return null;
    }

    console.log(results)
    const stateOptions = Object.values(statesUSA).map(item => <option key={`option-${item}`}>{item}</option>);

    return <div id="hospitals">
        <header>
          <div id="header-content">
            <div>
              <h1>covid-19 Surge Planning</h1>
              <h2>USA Hospitals Beds/Ventilator Capacity</h2>
            </div>
            <div class="header-links">
              <div class="link">
                <a class="img-link" href="https://github.com/octopicorn/covid19-charts" target="_blank"><img src="/github-logo.svg" /></a>
                <a class="text-link" href="https://github.com/octopicorn/covid19-charts" target="_blank">https://github.com/octopicorn/covid19-charts</a>
              </div>
              <div class="link">
                <a class="img-link" href="https://www.facebook.com/groups/pandemicsurgeplan/" target="_blank"><img src="/fb-logo.png" /></a>
                <a class="text-link" href="https://www.facebook.com/groups/pandemicsurgeplan/" target="_blank">https://www.facebook.com/groups/pandemicsurgeplan/</a>
              </div>
              <div class="link">
                <a className="img-link" href="https://www.arcgis.com/home/item.html?id=1044bb19da8d4dbfb6a96eb1b4ebf629" target="_blank"><i className={`fa fa-info-circle`}></i></a>
                <a href="https://www.arcgis.com/home/item.html?id=1044bb19da8d4dbfb6a96eb1b4ebf629" target="_blank">data source</a>
              </div>
            </div>
          </div>
          <div id="picker" style={{padding: 10, display: 'flex'}}>
            <div>
              <select defaultValue={selectedState} onChange={this.onSelectState}>
                {stateOptions}
              </select>
            </div>
            <div style={{marginLeft: 25}}>
              <strong>{results.length || 0} Results</strong>
            </div>
          </div>
        </header>

        <div id="content">

          <div style={{borderTop: 'solid 1px #333'}}>
            <table>
              <thead>
                <tr>
                  {this.renderColumn('COUNTY_NAME')}
                  {this.renderColumn('NUM_ICU_BEDS')}
                  {this.renderColumn('ADULT_ICU_BEDS')}
                  {this.renderColumn('PEDI_ICU_BEDS')}
                  {this.renderColumn('BED_UTILIZATION')}
                  {this.renderColumn('AVG_VENTILATOR_USAGE')}
                  {this.renderColumn('HOSPITAL_NAME')}
                  {this.renderColumn('HOSPITAL_TYPE')}
                  {this.renderColumn('HQ_ADDRESS')}
                  {this.renderColumn('HQ_ADDRESS1')}
                  {this.renderColumn('HQ_CITY')}
                  {this.renderColumn('HQ_STATE')}
                  {this.renderColumn('HQ_ZIP_CODE')}
                  {this.renderColumn('NUM_LICENSED_BEDS')}
                  {this.renderColumn('NUM_STAFFED_BEDS')}
                  {this.renderColumn('Potential_Increase_In_Bed_Capac')}
                </tr>
              </thead>
              <tbody>
              {results.map((item, index) => {
                return (
                  <tr key={`row-${index}`}>
                    <td>{item.attributes.COUNTY_NAME}</td>
                    <td>{item.attributes.NUM_ICU_BEDS}</td>
                    <td>{item.attributes.ADULT_ICU_BEDS}</td>
                    <td>{item.attributes.PEDI_ICU_BEDS}</td>
                    <td>{item.attributes.BED_UTILIZATION}</td>
                    <td>{item.attributes.AVG_VENTILATOR_USAGE}</td>
                    <td>{item.attributes.HOSPITAL_NAME}</td>
                    <td>{item.attributes.HOSPITAL_TYPE}</td>
                    <td>{item.attributes.HQ_ADDRESS}</td>
                    <td>{item.attributes.HQ_ADDRESS1}</td>
                    <td>{item.attributes.HQ_CITY}</td>
                    <td>{item.attributes.HQ_STATE}</td>
                    <td>{item.attributes.HQ_ZIP_CODE}</td>
                    <td>{item.attributes.NUM_LICENSED_BEDS}</td>
                    <td>{item.attributes.NUM_STAFFED_BEDS}</td>
                    <td>{item.attributes.Potential_Increase_In_Bed_Capac}</td>
                  </tr>
                )
              })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

  }
}

const domContainer = document.querySelector('#app_container');
ReactDOM.render(<HospitalsApp/>, domContainer);