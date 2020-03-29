# covid19-charts

## Purpose
Allow users to generate their own visualizations of the covid-19 pandemic, comparing timeseries for countries, states, and US counties.

<img width="1438" alt="covid19-charts" src="https://user-images.githubusercontent.com/2448666/77838866-a5a86e00-712c-11ea-8422-08ce32f70973.png">


## Requirements
1. have access to command line on your computer
2. have node.js installed (already done if you're on OS X)
3. have node.js > version 8 
    (to check: run `node -v` from command line. 
    If your version is lower than 8, easiest way to install a modern version is to use `nvm`. Google "install nvm" for more info.)
4. have an internet connection (just needed the first time so you can download datasets, after that you can run offline)


## Get Started
1. download this repo from github, or better yet `git clone` it, if you know how.
2. once you have downloaded it to your computer, go to the root project directory in command line.
3. run `npm i` (this is just short for `npm install`)
4. run `npm start` (this should download all dataset files and catch you up to the latest)
5. now that server is running locally, open your web browser to [http://localhost:3000]

# Usage
Click countries, states, or counties on the right hand menu to plot data from those areas of interest.

Some clickable buttons appear below the chart:
- toggle between bar chart or line chart
- toggle between linear or logarithmic scale
- toggle between confirmed vs deaths timeseries data

## To Do
- allow option to line up all visible timeseries to common starting day of first 100 cases. This is useful for inspecting differences in growth rate.
- add better documentation explaining how the data is collected, and where it comes from

## Data sets
Country and State data is from the public repo made available by Johns Hopkins CSSE.
All US county data since 3/23/2020 is read from their daily reports, which are automatically uploaded to their repo.

From the JH CSSE README: 
"This is the data repository for the 2019 Novel Coronavirus Visual Dashboard operated by the Johns Hopkins University Center for Systems Science and Engineering (JHU CSSE). Also, Supported by ESRI Living Atlas Team and the Johns Hopkins University Applied Physics Lab (JHU APL)."

Link: https://github.com/CSSEGISandData/COVID-19

Additional US County level data for the period between 1/22/2020 - 3/23/2020 is borrowed from USAFacts.org.
This data was manually aggregated and verified by pulling directly from the department of public health for each of the states.
From their website:
"If you'd like to use USAFacts county-level COVID-19 data, we've provided a download. The data is available under a Creative Commons license. We request that you cite USAFacts as the data provider and include a hyperlink back to this page."

Link: https://usafacts.org/visualizations/coronavirus-covid-19-spread-map/
 
 
## Contact Us
 
Create an issue or a pull request to get in touch (see tabs above).
 
