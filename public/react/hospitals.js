'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var statesUSA = {
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

  /**
   * Rule of thumb: Keep It Simple
   * using React in the simplest possible way here
   */
};
var HospitalsApp = function (_React$Component) {
  _inherits(HospitalsApp, _React$Component);

  function HospitalsApp(props) {
    _classCallCheck(this, HospitalsApp);

    var _this = _possibleConstructorReturn(this, (HospitalsApp.__proto__ || Object.getPrototypeOf(HospitalsApp)).call(this, props));

    _this.fetchResultsByState = function (stateCode) {
      // create a new XMLHttpRequest
      var xhr = new XMLHttpRequest();
      // get a callback when the server responds
      xhr.addEventListener('load', function () {
        // update the state of the component with the result here
        var parseResponse = JSON.parse(xhr.responseText);
        _this.setState({ results: parseResponse.features }, function () {
          return _this.onSort(_this.state.sortColumn);
        });
      });
      // open the request with the verb and the url
      xhr.open('GET', "https://services7.arcgis.com/LXCny1HyhQCUSueu/arcgis/rest/services/Definitive_Healthcare_USA_Hospital_Beds/FeatureServer/0/query?f=json&where=STATE_NAME%20%3D%20%27" + stateCode + "%27&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=*&orderByFields=NUM_LICENSED_BEDS%20desc&resultOffset=0&resultRecordCount=1000&cacheHint=true");
      // send the request
      xhr.send();
    };

    _this.onSelectState = function (e) {
      // e.preventDefault();
      var state = e.target.value;
      _this.fetchResultsByState(state);
    };

    _this.renderColumn = function (column) {
      var _this$state = _this.state,
          sortAsc = _this$state.sortAsc,
          sortColumn = _this$state.sortColumn;

      var icon = void 0;
      if (column === sortColumn) {
        var faImage = sortAsc ? 'fa-sort-up' : 'fa-sort-down';
        icon = React.createElement("i", { className: "fa " + faImage });
      } else {
        icon = React.createElement("span", null);
      }
      return React.createElement(
        "th",
        { className: "sticky", onClick: function onClick() {
            return _this.onSort(column);
          } },
        React.createElement(
          "div",
          { style: { display: 'flex' } },
          React.createElement(
            "div",
            { style: { width: 20, padding: 5 } },
            icon
          ),
          React.createElement(
            "div",
            null,
            column.replace(/_/g, ' ')
          )
        )
      );
    };

    _this.onSort = function (column) {
      var newResults = [].concat(_toConsumableArray(_this.state.results));

      var _this$state2 = _this.state,
          sortAsc = _this$state2.sortAsc,
          sortColumn = _this$state2.sortColumn;


      var newSortAsc = sortAsc;
      if (column === sortColumn) {
        newSortAsc = !newSortAsc;
      } else {
        newSortAsc = true;
      }

      newResults.sort(function (inputA, inputB) {
        var a = void 0;
        var b = void 0;

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
      });

      _this.setState({
        results: newResults,
        sortColumn: column,
        sortAsc: newSortAsc
      });
    };

    _this.state = {
      selectedState: 'California',
      results: [],
      sortColumn: 'ADULT_ICU_BEDS',
      sortAsc: true
    };
    return _this;
  }

  _createClass(HospitalsApp, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      var selectedState = this.state.selectedState;

      this.fetchResultsByState(selectedState);
    }
  }, {
    key: "render",
    value: function render() {
      var _state = this.state,
          results = _state.results,
          selectedState = _state.selectedState;


      if (!results) {
        return null;
      }

      var stateOptions = Object.values(statesUSA).map(function (item) {
        return React.createElement(
          "option",
          { key: "option-" + item },
          item
        );
      });

      return React.createElement(
        "div",
        { id: "hospitals" },
        React.createElement(
          "header",
          null,
          React.createElement(
            "div",
            { id: "header-content" },
            React.createElement(
              "div",
              null,
              React.createElement(
                "h1",
                null,
                "covid-19 Surge Planning"
              ),
              React.createElement(
                "h2",
                null,
                "USA Hospitals Bed/Ventilator Capacity"
              )
            ),
            React.createElement(
              "div",
              { className: "header-links" },
              React.createElement(
                "div",
                { className: "link" },
                React.createElement(
                  "a",
                  { className: "img-link", href: "https://www.facebook.com/groups/pandemicsurgeplan/", target: "_blank" },
                  React.createElement("img", { src: "/fb-logo.png" })
                ),
                React.createElement(
                  "a",
                  { className: "text-link", href: "https://www.facebook.com/groups/pandemicsurgeplan/", target: "_blank" },
                  "https://www.facebook.com/groups/pandemicsurgeplan/"
                )
              ),
              React.createElement(
                "div",
                { className: "link" },
                React.createElement(
                  "a",
                  { className: "img-link", href: "https://www.arcgis.com/home/item.html?id=1044bb19da8d4dbfb6a96eb1b4ebf629", target: "_blank" },
                  React.createElement("i", { className: "fa fa-info-circle" })
                ),
                React.createElement(
                  "a",
                  { className: "text-link", href: "https://www.arcgis.com/home/item.html?id=1044bb19da8d4dbfb6a96eb1b4ebf629", target: "_blank" },
                  "data source"
                )
              ),
              React.createElement(
                "div",
                { className: "link" },
                React.createElement(
                  "a",
                  { className: "img-link", href: "https://github.com/octopicorn/covid19-charts", target: "_blank" },
                  React.createElement("img", { src: "/github-logo.svg" })
                ),
                React.createElement(
                  "a",
                  { className: "text-link", href: "https://github.com/octopicorn/covid19-charts", target: "_blank" },
                  "https://github.com/octopicorn/covid19-charts"
                )
              )
            )
          ),
          React.createElement(
            "div",
            { id: "picker", style: { padding: 10, display: 'flex' } },
            React.createElement(
              "div",
              null,
              React.createElement(
                "div",
                { style: { display: 'flex' } },
                React.createElement(
                  "div",
                  { style: { padding: '2px 5px' } },
                  React.createElement("i", { className: "fa fa-star", style: { color: 'gold' } }),
                  " Select State"
                )
              ),
              React.createElement(
                "select",
                { defaultValue: selectedState, onChange: this.onSelectState },
                stateOptions
              ),
              React.createElement(
                "span",
                { style: { paddingLeft: 5, fontWeight: 'bold' } },
                results.length || 0,
                " Results"
              )
            )
          )
        ),
        React.createElement(
          "div",
          { id: "content" },
          React.createElement(
            "table",
            null,
            React.createElement(
              "thead",
              null,
              React.createElement(
                "tr",
                null,
                this.renderColumn('HOSPITAL_NAME'),
                this.renderColumn('COUNTY_NAME'),
                this.renderColumn('NUM_ICU_BEDS'),
                this.renderColumn('ADULT_ICU_BEDS'),
                this.renderColumn('PEDI_ICU_BEDS'),
                this.renderColumn('BED_UTILIZATION'),
                this.renderColumn('AVG_VENTILATOR_USAGE'),
                this.renderColumn('HOSPITAL_TYPE'),
                this.renderColumn('HQ_ADDRESS'),
                this.renderColumn('HQ_ADDRESS1'),
                this.renderColumn('HQ_CITY'),
                this.renderColumn('HQ_STATE'),
                this.renderColumn('HQ_ZIP_CODE'),
                this.renderColumn('NUM_LICENSED_BEDS'),
                this.renderColumn('NUM_STAFFED_BEDS'),
                this.renderColumn('Potential_Increase_In_Bed_Capac')
              )
            ),
            React.createElement(
              "tbody",
              null,
              results.map(function (item, index) {
                return React.createElement(
                  "tr",
                  { key: "row-" + index },
                  React.createElement(
                    "td",
                    null,
                    item.attributes.HOSPITAL_NAME
                  ),
                  React.createElement(
                    "td",
                    null,
                    item.attributes.COUNTY_NAME
                  ),
                  React.createElement(
                    "td",
                    null,
                    item.attributes.NUM_ICU_BEDS
                  ),
                  React.createElement(
                    "td",
                    null,
                    item.attributes.ADULT_ICU_BEDS
                  ),
                  React.createElement(
                    "td",
                    null,
                    item.attributes.PEDI_ICU_BEDS
                  ),
                  React.createElement(
                    "td",
                    null,
                    item.attributes.BED_UTILIZATION
                  ),
                  React.createElement(
                    "td",
                    null,
                    item.attributes.AVG_VENTILATOR_USAGE
                  ),
                  React.createElement(
                    "td",
                    null,
                    item.attributes.HOSPITAL_TYPE
                  ),
                  React.createElement(
                    "td",
                    null,
                    item.attributes.HQ_ADDRESS
                  ),
                  React.createElement(
                    "td",
                    null,
                    item.attributes.HQ_ADDRESS1
                  ),
                  React.createElement(
                    "td",
                    null,
                    item.attributes.HQ_CITY
                  ),
                  React.createElement(
                    "td",
                    null,
                    item.attributes.HQ_STATE
                  ),
                  React.createElement(
                    "td",
                    null,
                    item.attributes.HQ_ZIP_CODE
                  ),
                  React.createElement(
                    "td",
                    null,
                    item.attributes.NUM_LICENSED_BEDS
                  ),
                  React.createElement(
                    "td",
                    null,
                    item.attributes.NUM_STAFFED_BEDS
                  ),
                  React.createElement(
                    "td",
                    null,
                    item.attributes.Potential_Increase_In_Bed_Capac
                  )
                );
              })
            )
          )
        )
      );
    }
  }]);

  return HospitalsApp;
}(React.Component);

var domContainer = document.querySelector('#app_container');
ReactDOM.render(React.createElement(HospitalsApp, null), domContainer);