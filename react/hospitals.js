'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

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
      console.log('fetching data for', stateCode);
    };

    _this.state = {
      selectedState: 'CA'
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

      return React.createElement(
        "div",
        { id: "hospitals" },
        React.createElement(
          "header",
          null,
          React.createElement(
            "div",
            { style: "padding-bottom: 5px;" },
            React.createElement(
              "h1",
              null,
              "covid-19 Surge Planning"
            ),
            React.createElement(
              "span",
              null,
              "USA Hospitals Beds/Ventilator Capacity"
            )
          ),
          React.createElement(
            "div",
            { "class": "header-links" },
            React.createElement(
              "div",
              { "class": "link" },
              React.createElement(
                "a",
                { href: "https://github.com/octopicorn/covid19-charts", target: "_blank" },
                React.createElement("img", { src: "/github-logo.svg" })
              ),
              React.createElement(
                "a",
                { "class": "text-link", href: "https://github.com/octopicorn/covid19-charts", target: "_blank" },
                "https://github.com/octopicorn/covid19-charts"
              )
            ),
            React.createElement(
              "div",
              { "class": "link" },
              React.createElement(
                "a",
                { href: "https://www.facebook.com/groups/pandemicsurgeplan/", target: "_blank" },
                React.createElement("img", { src: "/fb-logo.png" })
              ),
              React.createElement(
                "a",
                { "class": "text-link", href: "https://www.facebook.com/groups/pandemicsurgeplan/", target: "_blank" },
                "https://www.facebook.com/groups/pandemicsurgeplan/"
              )
            ),
            React.createElement(
              "div",
              { "class": "link" },
              React.createElement(
                "a",
                { href: "https://www.arcgis.com/home/item.html?id=1044bb19da8d4dbfb6a96eb1b4ebf629", target: "_blank" },
                "data source"
              )
            )
          )
        ),
        React.createElement(
          "div",
          { id: "content" },
          React.createElement(
            "div",
            null,
            "hi"
          )
        )
      );
    }
  }]);

  return HospitalsApp;
}(React.Component);

var domContainer = document.querySelector('#app_container');
ReactDOM.render(React.createElement(HospitalsApp, null), domContainer);