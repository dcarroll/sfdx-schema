"use strict"

const util = require('util');
const path = require('path');
const parser = require('xml2json');
const fs = require('fs');
const vscode = require('vscode');

function run() {
    if (process.argv[3] === "save") {
        toXml(process.argv[2]);
    } else {
        toJson(process.argv[2]);
    }
}

function getSourcePath() {
    var wsRoot = vscode.workspace.workspaceFolders[0].uri.path;
    const dxProjJsonString = fs.readFileSync(path.join(wsRoot, "sfdx-project.json")).toString();
    var dxProj = JSON.parse(dxProjJsonString);
    for (var x = 0; x < dxProj.packageDirectories.length; x++) {
        if (dxProj.packageDirectories[x].default === true) {
            return path.join(wsRoot, dxProj.packageDirectories[x].path);
        }
    }
    return wsRoot;
}

function getJsonPath(xmlFile) {
    var sourcePath = getSourcePath();
    var filepath = path.dirname(xmlFile);
    var fileName = path.basename(xmlFile);
    var jsonFile = fileName.replace("meta.xml", "meta.json");

    var pathDelta = [];
    while (path.basename(filepath) !== path.basename(sourcePath)) {
        pathDelta.splice(0, 0, path.basename(filepath));
        filepath = path.dirname(filepath);
    }
    const jsonDir = vscode.workspace.getConfiguration("dsave").get('jsonDir');
    const sourceDir = path.join(
        path.dirname(sourcePath),
        jsonDir, 
        path.basename(sourcePath),
        pathDelta.join(path.sep));

    if (!fs.existsSync(sourceDir)) {
        mkJsonDir(sourceDir);
    }
    return { sourceDir: sourceDir, jsonFile: jsonFile } ;
}

function getXmlPath(jsonFile) {
    var sourcePath = getSourcePath();
    var filepath = path.dirname(jsonFile);
    var fileName = path.basename(jsonFile);
    var xmlFile = fileName.replace("meta.json", "meta.xml");

    var pathDelta = [];
    while (path.basename(filepath) !== path.basename(sourcePath)) {
        pathDelta.splice(0, 0, path.basename(filepath));
        filepath = path.dirname(filepath);
    }

    const sourceDir = path.join(
        path.dirname(sourcePath),
        path.basename(sourcePath),
        pathDelta.join(path.sep));

    if (!fs.existsSync(sourceDir)) {
        mkXmlDir(sourceDir);
    }
    return { sourceDir: sourceDir, xmlFile: xmlFile } ;
}

// Accepts a file path (fq or not) and converts to JSON
// Returns nothing, rather a file is written to the same location as 
// the the xml file that was passed.
function toJson(xmlFile) {
    var xml = fs.readFileSync(path.join(path.dirname(xmlFile), path.basename(xmlFile))).toString();
    var json = JSON.parse(parser.toJson(xml, { reversible: false }));
    json = typeFixerForJson(json);

    const jsonPath = getJsonPath(xmlFile);
    fs.writeFileSync(path.join(jsonPath.sourceDir, jsonPath.jsonFile), JSON.stringify(json, null, 4));
}

function mkJsonDir(dir) {
    let dirs = [];
    while (!fs.existsSync(dir)) {
        dirs.splice(0, 0, path.basename(dir));
        dir = path.dirname(dir);
    }
    for (var i = 0; i < dirs.length; i++) {
        dir = path.join(dir, dirs[i]);
        fs.mkdirSync(dir);
    }
}

function mkXmlDir(dir) {
    let dirs = [];
    while (!fs.existsSync(dir)) {
        dirs.splice(0, 0, path.basename(dir));
        dir = path.dirname(dir);
    }
    for (var i = 0; i < dirs.length; i++) {
        dir = path.join(dir, dirs[i]);
        fs.mkdirSync(dir);
    }
}

function typeFixerForJson(json) {
    for (var key in json) {
        if (key === 'type') {
            json['_type'] = json[key];
            delete(json[key]);
        } else if (key === 'xmlns') {
            delete(json[key]);
        } else if (typeof json[key] === "string") {
            var parsed = parseInt(json[key]);
            if (!isNaN(parsed)) { 
                json[key] = parsed;
            } else {
                if (json[key] == 'true') {
                    json[key] = true;
                } else if (json[key] == 'false') {
                    json[key] = false;
                }
            }
        } else {
            json[key] = typeFixerForJson(json[key]);
        }
    }
    return json;
}

function typeFixerForXml(json) {
    for (var key in json) {
        if (key === '_type') {
            json['type'] = json[key];
            delete(json[key]);
        } else if (typeof json[key] === "object") {
            json[key] = typeFixerForXml(json[key]);
        }
    }
    return json;
}

// Takes a json metadata definition file and converts to a
// correct metadata xml file.
function toXml(jsonFile) {
    //var sourcePath = getSourcePath();
    var jsonText = fs.readFileSync(jsonFile).toString();
    var json = typeFixerForXml(JSON.parse(jsonText));
    var xmlOut = '<?xml version="1.0" encoding="UTF-8"?>';

    for (var metaDataType in json) {
        var xmlns = (json[metaDataType].xmlns === undefined) ? "http://soap.sforce.com/2006/04/metadata" : json[metaDataType].xmlns;
        xmlOut += '\n<' + metaDataType + ' xmlns="' + xmlns + '">\n';
        for (var name in json[metaDataType]) {
            if (name !== 'xmlns') {
                xmlOut += makeXmlTag(name, json[metaDataType][name]) + "";
            }
        }
        xmlOut += '</' + metaDataType + '>';
    }
    //var xmlFile = jsonFile.replace("meta.json", "meta1.xml");
    const xmlPath = getXmlPath(jsonFile);
    fs.writeFileSync(path.join(xmlPath.sourceDir, xmlPath.xmlFile), xmlOut);
}

function makeXmlTag(name, obj) {
    let xmlTag = "";
    if (!util.isObject(obj)) {
        xmlTag = "\t<" + name + ">" + obj + "</" + name + ">";
    } else {
        if (util.isArray(obj)) {
            obj.forEach(function(value, index, range) {
                xmlTag += "\t<" + name + ">\n";
                for (var objName in value) {
                    xmlTag += "\t" + makeXmlTag(objName, value[objName]) + "";
                }
                xmlTag += "\t</" + name + ">";
                if (index !== range.length -1) {
                    xmlTag += "\n";
                }
            });
            console.log("leaving");
        } else {
            if (Object.keys(obj).length > 0) {
                xmlTag += "\t<" + name + ">\n";
                for (var objName in obj) {
                    xmlTag += "\t" + makeXmlTag(objName, obj[objName]) + "";
                }
                xmlTag += "\t</" + name + ">";
            } else {
                xmlTag += "\t<" + name + "/>";
            }
        }
    }
    return xmlTag + "\n";
}

module.exports.toXml = toXml;
module.exports.toJson = toJson;
module.exports.run = run;