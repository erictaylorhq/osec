// Get members and print to column 1
// Get bill info and print number to header cell
//

var ROLE_TYPE = "representative";
var CONGRESS = 114;

// Get current members.
function getMembers() {

  var url = "https://www.govtrack.us/api/v2/role?current=true&limit=500&role_type="+ROLE_TYPE;
  var membersFetch = UrlFetchApp.fetch(url).getContentText();
  var data = JSON.parse(membersFetch);
  var members = [];
  var roleType = ROLE_TYPE.charAt(0).toUpperCase() + ROLE_TYPE.slice(1);

  for(i = 0; i < data.objects.length; i++) {
    if(data.objects[i].title_long === roleType) {
      var id = data.objects[i].person.id;
      var last = data.objects[i].person.lastname;
      var state = data.objects[i].state;
      members.push({"id": id, "last": last, "state": state});
    }
  }
  var sorted = members.sort(function(a, b) {
    return a.id - b.id;
  });
  Logger.log(sorted);
  return sorted;
}

// Get bill votes and print bill number.
function getBillVotes() {

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.insertSheet(1);
  Utilities.sleep(100);
  var sheet = ss.getSheets()[0];
  var sheet1 = ss.getSheets()[1];
  var range = sheet.getDataRange();
  var data = range.getValues();
  var votesArr = [];

  for(i=1; i<data.length; i++) {
    var congress = CONGRESS;
    var year = data[i][0].toString();
    var status = data[i][3].toString();
    var rollNumber = data[i][1].toString()
    var roll = congress+"-"+year+"-"+rollNumber;
    var rollURL = "https://www.govtrack.us/congress/votes/"+congress+"-"+year+"/h"+rollNumber+"/export/xml";
    var rollFetch = UrlFetchApp.fetch(rollURL).getContentText();
    var doc = XmlService.parse(rollFetch);
    var root = doc.getRootElement();
    var voters = root.getChildren('voter');
    var number = root.getChild('bill').getAttribute('number').getValue();
    var col = i+1;

    sheet1.getRange(1,i+1).setValue(number+"-"+status);
    for(j=0; j<voters.length; j++) {
      var id = voters[j].getAttribute('id').getValue();
      var vote = voters[j].getAttribute('vote').getValue().toString();
      if(vote === "+") {
        var v = "Y";
      } else if(vote === "-") {
        var v = "N";
      } else if(vote === "0") {
        var v = "NV";
      }
      votesArr.push({"bill": number, "col": col, "member": id, "vote": v});
    }
  }
  return votesArr;
}

function mergeVotes(votesArr) {
  var votesArr = getBillVotes();
  Utilities.sleep(100);

  var output = votesArr.reduce(function(o, cur) {
    var occurs = o.reduce(function(n, item, i) {
      return (item.member === cur.member) ? i : n;
    }, -1);
    if (occurs >= 0) {
      o[occurs].vote = o[occurs].vote.concat(cur.vote+"-"+cur.col);
    } else {
      var obj = {member: cur.member, vote: [cur.vote+"-"+cur.col]};
      o = o.concat([obj]);
    }
    return o;
  }, []);

  Logger.log(output);
  return output;

}

// Prints bill votes to a new a sheet.
function printBillVotes_step1(votes) {
  var votes = mergeVotes();
  Utilities.sleep(100);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[1];

  for(i=0; i<votes.length; i++) {
    var member = votes[i].member;
    sheet.getRange(i+2,1).setValue(member);
    for(j=0; j<votes[i].vote.length; j++) {
      var row = i+2;
      var val = votes[i].vote[j].split("-");
      var col = parseInt(val[1]);
      var vote = val[0]
      sheet.getRange(row,col).setValue(vote);
    }
  }
  Utilities.sleep(100);
  SpreadsheetApp.setActiveSheet(ss.getSheets()[1]);
}

// Converts bill votes as Y or No to 1 or 0.
function votesToNumbers_step2() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.insertSheet(2);
  Utilities.sleep(100);
  var sheet1 = ss.getSheets()[1];
  var sheet2 = ss.getSheets()[2];

  var lastCol = sheet1.getLastColumn();

  var range = sheet1.getDataRange();
  var data = range.getValues();
  for(i=0; i<data.length ; i++) {
    for(j=0; j<lastCol; j++) {
      if(data[i][j] === "Y") {
        sheet2.getRange(i+1,j+1).setValue(parseInt(1));
      } else if(data[i][j] === "N") {
        sheet2.getRange(i+1,j+1).setValue(parseInt(0));
      } else if(data[i][j] === "NV") {
        sheet2.getRange(i+1,j+1).setValue(parseInt(0));
      } else if(data[i][j] === ""){
        sheet2.getRange(i+1,j+1).setValue(parseFloat(-0.001));
      } else {
        sheet2.getRange(i+1,j+1).setValue(data[i][j]);
      }
    }
  }

  Utilities.sleep(100);
  sheet2.getRange(1,1).setValue("");
}

// Change score to reflect status of bill.
function applyStatus_step3() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[2];
  var range = sheet.getDataRange();
  var data = range.getValues();
  var lastCol = sheet.getLastColumn();
  var lastRow = sheet.getLastRow();
  for(i=0; i<lastRow; i++) {
    for(j=0; j<lastCol; j++) {
      var status = data[0][j].split("-")[1];
      var val = data[i][j];
      if(status === "bad" && val === parseInt(1)) {
        sheet.getRange(i+1,j+1).setValue(parseInt(0));
      } else if(status === "bad" && val === parseInt(0)) {
        sheet.getRange(i+1,j+1).setValue(parseInt(1));
      } else if(status === "good" && val === parseInt(1)) {
        sheet.getRange(i+1,j+1).setValue(parseInt(1));
      } else if(status === "good" && val === parseInt(0)) {
        sheet.getRange(i+1,j+1).setValue(parseInt(0));
      }
    }
  }
}

// Sort data by column 1.
function sortColumn1_step4() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[2];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var range = sheet.getRange(2, 1, lastRow, lastCol);
  range.sort({column: 1, ascending: true});
}

// Replace name in column 1.
function printNames_step5() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[2];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var data = sheet.getRange(1,1, lastRow).getValues();
  sheet.insertColumns(2, 2);
  for(i=1; i<lastRow; i++) {
    var person = data[i][0];
    if(!isNaN(person)){
      var id = person;
      var url = "https://www.govtrack.us/api/v2/person/"+id;
      var memberFetch = UrlFetchApp.fetch(url).getContentText();
      var json = JSON.parse(memberFetch);
      var last = json.lastname;
      var state = json.roles[0].state;
      var party = json.roles[0].party;
      sheet.getRange(i+1,1).setValue(last);
      sheet.getRange(i+1,2).setValue(state);
      sheet.getRange(i+1,3).setValue(party);
    }

  }
}

// Gets bill IDs for govtrack
function getIDs(bills) {

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[1];
  var lastCol = sheet.getLastColumn();
  var data = sheet.getRange(1,2,1,lastCol).getValues();

  var idArr = [];
  for(i=0; i<lastCol-1; i++) {
    var congress = CONGRESS;
    var number = data[0][i].toString().split("-")[0];
    var status = data[0][i].toString().split("-")[1];
    var url = "https://www.govtrack.us/api/v2/bill?congress="+congress+"&number="+number+"&bill_type=house_bill";
    var billFetch = UrlFetchApp.fetch(url).getContentText();
    var json = JSON.parse(billFetch);
    idArr.push({"number": number, "status": status, "id": json.objects[0].id})
  }
  return idArr;
}

// Get sponsors.
function getSponsors(idArr) {
  var idArr = getIDs();
  Utilities.sleep(100);
  var sponsorsArr = [];
  var cosponsorsArr = [];
  for(i = 0; i < idArr.length; i++) {
    var number = idArr[i].number;
    var id = idArr[i].id;
    var status = idArr[i].status;
    var url = "https://www.govtrack.us/api/v2/bill/"+id;
    var billFetch = UrlFetchApp.fetch(url).getContentText();
    var data = JSON.parse(billFetch);
    if(data.sponsor.id) {
      sponsorsArr.push({"bill": number, "status": status, "sponsor": data.sponsor.id})
    }
    if(data.cosponsors.length > 0) {
      for(j = 0; j < data.cosponsors.length; j++) {
        cosponsorsArr.push({"bill": number, "status": status, "cosponsor": data.cosponsors[j].id})
      }
    }
  }
  var obj = JSON.stringify({"sponsors": sponsorsArr, "cosponsors": cosponsorsArr});
  return obj;
}

// Add bonuses for sponsoring and cosponsors bills.
function addBonuses_step6() {
  var sponsorArr = getSponsors();
  Utilities.sleep(100);
  var sponsors = JSON.parse(sponsorArr);
  Utilities.sleep(100);
  var membersArr = getMembers();
  Utilities.sleep(100);
  var billsArr = getIDs();
  Utilities.sleep(100);


  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.insertSheet(3);
  var sheet = ss.getSheets()[1];
  var sheet3 = ss.getSheets()[3];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var data = sheet.getRange(2,1,lastRow,1).getValues().sort(function(a, b) {
    return a - b;
  });
  Utilities.sleep(100);
  var bills = sheet.getRange(1,2,1,lastCol).getValues();

  for(i=0; i<lastRow; i++) {
    var id = data[i][0];
    sheet3.getRange(i+1, 1).setValue(id);
  }

  Utilities.sleep(100);
  for(j=0; j<lastCol; j++) {
    var bill = bills[0][j];
    sheet3.getRange(1, j+2).setValue(bill);
  }

  Utilities.sleep(100);
  for(i=0; i<sponsors.sponsors.length; i++) {
    var sponsor = sponsors.sponsors[i].sponsor;
    var bill = sponsors.sponsors[i].bill;
    var status = sponsors.sponsors[i].status;
    var row = membersArr.map(function(o) { return o.id; }).indexOf(sponsor);
    var col = billsArr.map(function(o) { return o.number; }).indexOf(bill);
    if(status === "bad") {
      sheet3.getRange(row+2, col+2).setValue(parseFloat(-0.5));
    } else if(status === "good") {
      sheet3.getRange(row+2, col+2).setValue(parseFloat(1.5));
    }

  }

  Utilities.sleep(100);
  for(i=0; i<sponsors.cosponsors.length; i++) {
    var cosponsor = sponsors.cosponsors[i].sponsor;
    var bill = sponsors.cosponsors[i].bill;
    var status = sponsors.cosponsors[i].status;
    var row = membersArr.map(function(o) { return o.id; }).indexOf(sponsor);
    var col = billsArr.map(function(o) { return o.number; }).indexOf(bill);
    if(status === "bad") {
      sheet3.getRange(row+2, col+2).setValue(parseFloat(-0.1));
    } else if(status === "good") {
      sheet3.getRange(row+2, col+2).setValue(parseFloat(1.1));
    }
  }

  Utilities.sleep(100);
  var votes = sheet3.getDataRange().getValues();
  sheet3.insertColumnsAfter(lastCol, 1);
  for(i=1; i<lastRow; i++) {
    var n = 0;
    var d = 0;
    for(j=1; j<lastCol; j++) {
      if(votes[i][j] === 1.1 || votes[i][j] === 1.5 || votes[i][j] === -0.1 || votes[i][j] === -0.5) {
        d += 1;
      }

      var vote = votes[i][j];
      if(vote === 1.5){
        n += 1.5;
      } else if(vote === 1.1){
        n += 1.1;
      } else if(vote === -0.5){
        n += -0.5;
      } else if(vote === -0.1){
        n += -0.1;
      }

      sheet3.getRange(i+1, lastCol+1).setValue(parseFloat(n));
      sheet3.getRange(i+1, lastCol+2).setValue(parseFloat(d));
    }
  }
}

// Calculate score
function calculateScore_step7() {
  var score = 0;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[2];
  var sheet4 = ss.getSheets()[3];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var lastRow4 = sheet4.getLastRow();
  var lastCol4 = sheet4.getLastColumn();
  var data = sheet.getDataRange().getValues();

  sheet.insertColumnsAfter(lastCol, 3);
  for(i=1; i<lastRow4; i++) {
    var n = sheet4.getRange(i+1, lastCol4 - 1).getValue();
    var d = sheet4.getRange(i+1, lastCol4).getValue();

    sheet.getRange(i+1, lastCol+1).setValue(n);
    sheet.getRange(i+1, lastCol+2).setValue(d);

  }

  Utilities.sleep(100);
  for(i=1; i<lastRow; i++) {
    var n = 0;
    var d = 0;
    var score = 0;
    var x = sheet.getRange(i+1, lastCol+1).getValue();
    var y = sheet.getRange(i+1, lastCol+2).getValue();
    for(j=3; j<lastCol; j++) {
      if(data[i][j] === 1 || data[i][j] === 0) {
        d += 1;
      }
      if(data[i][j] > 0) {
        n += data[i][j];
      }
      score = parseFloat((n+x)/(d+y)*100).toFixed(2);
      sheet.getRange(i+1,lastCol+3).setValue(score);
    }
  }
}

// Cleanup final sheet for viewing.
function cleanup_step8() {

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[1];
  var sheet3 = ss.getSheets()[2];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var lastCol3 = sheet3.getLastColumn();

  var range = sheet.getRange(2, 1, lastRow, lastCol);
  var data = range.getValues();
  range.sort({column: 1, ascending: true});
  Utilities.sleep(100);
  var d = sheet.getRange(1,1, lastRow).getValues();
  sheet.insertColumnsAfter(lastCol, 1)
  sheet.insertColumns(2, 2);

  for(i=1; i<lastRow ; i++) {
    var person = d[i][0];
    if(!isNaN(person)){
      var id = person;
      var url = "https://www.govtrack.us/api/v2/person/"+id;
      var memberFetch = UrlFetchApp.fetch(url).getContentText();
      var json = JSON.parse(memberFetch);
      var last = json.lastname;
      var state = json.roles[0].state;
      var party = json.roles[0].party;
      sheet.getRange(i+1,1).setValue(last);
      sheet.getRange(i+1,2).setValue(state);
      sheet.getRange(i+1,3).setValue(party);
    }
  }

  Utilities.sleep(100);
  for(i=1; i<lastRow; i++) {
    var score = sheet3.getRange(i+1, lastCol3).getValue();
    sheet.getRange(i+1, lastCol+3).setValue(score);
  }

  Utilities.sleep(100);
  sheet.getRange(1,lastCol+3).setValue("score");

}
