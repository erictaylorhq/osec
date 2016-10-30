# repRank.js

_repRank.js_ is a script written for google sheets that pulls into data from govtrack on how representatives voted on selected bills in order to produce  a ranking of representatives. It was written in order to generate a ranking of how Congress members voted on bills impacting financial industry regulations but it can be used to produce a ranking along other lines of interest - e.g. environmental regulations, labor standards, trade, etc.

## Installation

Create a spreadsheet in google docs, and copy and paste the script into the script editor

## Usage

In order to produce a ranking one needs to first select a coherent set of bills and create a google sheet that has the following information about the bills:

column 1 is the year of the bill vote
column 2 is the roll call number of the bill vote
column 3 is a the bills weight - i.e. some bills have a larger impact and deserve a greater weight
column 4 is that status of the bill as being good or bad

In order to produce the ranking you have to run the series of functions in the script editor in steps. That is, you have to first run the function _printBillVotes_step1_ and wait for it complete before running the next function with _step2_ in it's name. There are 8 steps. This might seem convoluted but the macro had to be broken up this way to avoid running up against the the timeout limit imposed by Google. That is, app scripts can only run for a fixed amount of time and depending on how many bills are being ranked it is easy to exceed the execution time limit.

## Limitations

The script will only work for "current" members of Congress, or for bills voted on during the 114th Congress. It has to be modified if someone wants to rank members based upon votes that span multiple Congresses to account for turnover among representatives.
