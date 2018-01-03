"use strict"

const path = require('path');
const parser = require('xml2json');
const fs = require('fs');

function run() {
    if (process.argv[3] === "save") {
        toXml(process.argv[2]);
    } else {
        toJson(process.argv[2]);
    }
}
// Accepts a file path (fq or not) and converts to JSON
// Returns nothing, rather a file is written to the same location as 
// the the xml file that was passed.
module.exports.toJson = function toJson(file) {
    console.log(file + "\n\n");
    var xmlFile = path.basename(file);
    var xml = fs.readFileSync(path.join("mdsource", xmlFile)).toString();
    var json = JSON.stringify(JSON.parse(parser.toJson(xml, { reversible: false })), null, 4);
    console.log(xml + "\n\n");
    console.log(json);   
    console.log(parser.toXml(json)); 
    var jsonFile = xmlFile.replace("meta.xml", "meta.json");
    fs.writeFileSync(path.join("jsonsource", jsonFile), json);
}

// Takes a json metadata definition file and converts to a
// correct metadata xml file.
module.exports.toXml = function toXml(file) {
    var jsonFile = file; //path.basename(file);
    var jsonText = fs.readFileSync(jsonFile).toString();
    var json = JSON.parse(jsonText);
    var xmlOut = '<?xml version="1.0" encoding="UTF-8"?>';
    console.log(JSON.stringify(json, null, 4));
    for (var metaDataType in json) {
        var xmlns = (json[metaDataType].xmlns === undefined) ? "http://soap.sforce.com/2006/04/metadata" : json[metaDataType].xmlns;
        xmlOut += '\n<' + metaDataType + ' xmlns="' + xmlns + '">';
        for (var name in json[metaDataType]) {
            if (name !== 'xmlns') {
                xmlOut += "\n" + makeXmlTag(name, json[metaDataType][name]);
            }
        }
        xmlOut += '\n</' + metaDataType + '>';
    }
    var xmlFile = jsonFile.replace("meta.json", "meta1.xml");
    fs.writeFileSync(xmlFile, xmlOut);
}

function makeXmlTag(name, obj) {
    if (name.indexOf("_") === 0) {
        name = name.substring(1);
    }
    if (typeof obj === "string") {
        return "\t<" + name + ">" + obj + "</" + name + ">";
    } else {
        for (var objName in obj) {
            return makeXmlTag(objName, obj[objName]);
        }
    }
}