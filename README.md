# repRank.js

_repRank.js_ is a script written for google sheets that pulls in data from govtrack on how representatives voted on selected bills in order to produce  a ranking of representatives. It was written in order to generate a ranking of how Congress members voted on bills impacting financial industry regulations but it can be used to produce a ranking along other lines of interest - e.g. environmental regulations, labor standards, trade, etc.

## Installation

Create a spreadsheet in google docs, and copy and paste the script into the script editor.

## Usage

In order to produce a ranking one needs to first select a coherent set of bills and create a google sheet that is formatted like such:

|  year | roll | weight | grade |
|  ------ | ------ | ------ | ------ |
|  2015 | 37 | 3 | bad |  
|  2016 | 510 | 1 | bad |  
|  2016 | 20 | 2 | bad |  
|  2016 | 12 | 1 | bad |  
|  2016 | 482 | 2 | bad |  
|  2016 | 28 | 3 | bad |  

* _year_ is the year (or session) in which the bill was voted on.
* _roll_ is the roll number of the bill vote.
* _weight_ is a measure of how important or impactifull the bill is.
* _grade_ is whether it is regarded as a __good__ or __bad__ bill.

In order to produce the ranking you have to run the series of functions in the script editor in steps. That is, you have to first run the function _printBillVotes_step1_ and wait for it complete before running the next function with _step2_ in its name. There are 8 steps. This might seem convoluted but the script had to be broken up in order to avoid running up against the timeout limit imposed by Google. That is, app scripts can only run for a fixed amount of time and depending on how many bills are being ranked it is easy to exceed the maximum execution time limit.

## Limitations

The script will only work for "current" members of Congress, or for bills voted on during the 114th Congress. It has to be modified if someone wants to rank members based upon votes that span multiple Congresses.
