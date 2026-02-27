/* ======================================================
   HCCS-DRM Survey — Google Apps Script Backend
   3 Sheets: Responses, Episodes, Diagnosis
   ====================================================== */

// ──────── Header Definitions ────────
var RESPONSE_HEADERS = [
  'RespondentID','Timestamp','PhoneNumber',
  // HCCS Part3: Q1-Q12
  'Q1_SelectionFactor','Q2_CourseAvailability','Q3_Guidance','Q4_CareerLink',
  'Q5_Difficulties','Q6_SelectionImprovement',
  'Q7_AchievementUnderstanding','Q8_AchievementFairness','Q9_FiveTierSystem','Q10_IncompleteSystem',
  'Q11_AssessmentProblem','Q12_AssessmentImprovement',
  // Part4 Iloh Model: Q13-Q20
  'Q13_BiggestBarrier',
  'Q14_InfoAccess1','Q14_InfoAccess2','Q14_InfoAccess3',
  'Q15_InfoSources','Q16_InfoDesert',
  'Q17_TimeUse1','Q17_TimeUse2','Q17_TimeUse3','Q17_TimeUse4',
  'Q18_TimeDesign',
  'Q19_OppAccess1','Q19_OppAccess2','Q19_OppAccess3','Q19_OppAccess4',
  'Q20_OppImprovement',
  // Part5 Wellbeing: Q21-Q29
  'Q21_Growth','Q22_Autonomy','Q23_Flow','Q24_Belonging','Q25_Meaning',
  'Q26_WB_Happy','Q26_WB_Confident','Q26_WB_Growth','Q26_WB_Anxious','Q26_WB_Bored','Q26_WB_Depressed',
  'Q27_Satisfaction','Q28_IdealDay','Q29_FreeComment',
  // Part6 Basic Info
  'Grade','SchoolType','Region','HasSelectedCourse'
];

var EPISODE_HEADERS = [
  'RespondentID','EpisodeID','StartTime','EndTime','Activity','Location','Companion'
];

var DIAGNOSIS_HEADERS = [
  'RespondentID','EpisodeID','Activity',
  'Information','InfoSources','InfoSourceEtc',
  'Time','OpportunityChosen','OpportunityFlexible',
  'Eudaimonia_Growth','Eudaimonia_Autonomy','Eudaimonia_Flow','Eudaimonia_Belonging','Eudaimonia_Meaning'
];

// ──────── Utility: Setup Headers on existing sheets ────────
function setupHeaders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Responses
  var respSheet = ss.getSheetByName('Responses');
  if (respSheet) {
    respSheet.insertRowBefore(1);
    respSheet.getRange(1, 1, 1, RESPONSE_HEADERS.length).setValues([RESPONSE_HEADERS]);
    respSheet.getRange(1, 1, 1, RESPONSE_HEADERS.length).setFontWeight('bold');
    respSheet.setFrozenRows(1);
  }

  // Episodes
  var epSheet = ss.getSheetByName('Episodes');
  if (epSheet) {
    epSheet.insertRowBefore(1);
    epSheet.getRange(1, 1, 1, EPISODE_HEADERS.length).setValues([EPISODE_HEADERS]);
    epSheet.getRange(1, 1, 1, EPISODE_HEADERS.length).setFontWeight('bold');
    epSheet.setFrozenRows(1);
  }

  // Diagnosis
  var diagSheet = ss.getSheetByName('Diagnosis');
  if (diagSheet) {
    diagSheet.insertRowBefore(1);
    diagSheet.getRange(1, 1, 1, DIAGNOSIS_HEADERS.length).setValues([DIAGNOSIS_HEADERS]);
    diagSheet.getRange(1, 1, 1, DIAGNOSIS_HEADERS.length).setFontWeight('bold');
    diagSheet.setFrozenRows(1);
  }

  SpreadsheetApp.getUi().alert('Headers added to all sheets!');
}

// ──────── doPost: Receive survey data ────────
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var respondentId = 'R_' + new Date().getTime();
    var timestamp = data.timestamp || new Date().toISOString();

    // === Sheet 1: Responses ===
    var respSheet = ss.getSheetByName('Responses');
    if (!respSheet) {
      respSheet = ss.insertSheet('Responses');
      respSheet.appendRow(RESPONSE_HEADERS);
      respSheet.getRange(1, 1, 1, RESPONSE_HEADERS.length).setFontWeight('bold');
      respSheet.setFrozenRows(1);
    }

    var hccs = data.hccs || {};
    var gr = data.globalReflection || {};
    var wb = data.wellbeing || {};
    var bi = data.basicInfo || {};

    respSheet.appendRow([
      respondentId, timestamp, data.phoneNumber || '',
      hccs.q1||'', hccs.q2||'', hccs.q3||'', hccs.q4||'',
      Array.isArray(hccs.q5) ? hccs.q5.join(', ') : (hccs.q5||''),
      hccs.q6||'',
      hccs.q7||'', hccs.q8||'', hccs.q9||'', hccs.q10||'',
      hccs.q11||'', hccs.q12||'',
      gr.biggestBarrier||'',
      gr.infoAccess1||'', gr.infoAccess2||'', gr.infoAccess3||'',
      Array.isArray(gr.infoSources) ? gr.infoSources.join(', ') : (gr.infoSources||''),
      gr.infoDesertExperience||'',
      gr.timeUse1||'', gr.timeUse2||'', gr.timeUse3||'', gr.timeUse4||'',
      gr.timeDesignSuggestion||'',
      gr.oppAccess1||'', gr.oppAccess2||'', gr.oppAccess3||'', gr.oppAccess4||'',
      gr.oppImproveSuggestion||'',
      wb.q21||'', wb.q22||'', wb.q23||'', wb.q24||'', wb.q25||'',
      wb.wb_happy||'', wb.wb_confident||'', wb.wb_growth||'', wb.wb_anxious||'', wb.wb_bored||'', wb.wb_depressed||'',
      wb.q27||'', wb.idealDay||'', wb.freeComment||'',
      bi.grade||'', bi.schoolType||'', bi.region||'', bi.hasSelected||''
    ]);

    // === Sheet 2: Episodes ===
    var epSheet = ss.getSheetByName('Episodes');
    if (!epSheet) {
      epSheet = ss.insertSheet('Episodes');
      epSheet.appendRow(EPISODE_HEADERS);
      epSheet.getRange(1, 1, 1, EPISODE_HEADERS.length).setFontWeight('bold');
      epSheet.setFrozenRows(1);
    }
    if (data.episodes && Array.isArray(data.episodes)) {
      data.episodes.forEach(function(ep) {
        epSheet.appendRow([respondentId, ep.id||'', ep.startTime||'', ep.endTime||'', ep.activity||'', ep.location||'', ep.companion||'']);
      });
    }

    // === Sheet 3: Diagnosis ===
    var diagSheet = ss.getSheetByName('Diagnosis');
    if (!diagSheet) {
      diagSheet = ss.insertSheet('Diagnosis');
      diagSheet.appendRow(DIAGNOSIS_HEADERS);
      diagSheet.getRange(1, 1, 1, DIAGNOSIS_HEADERS.length).setFontWeight('bold');
      diagSheet.setFrozenRows(1);
    }
    if (data.diagnoses && Array.isArray(data.diagnoses)) {
      data.diagnoses.forEach(function(d) {
        diagSheet.appendRow([
          respondentId, d.episodeId||'', d.activity||'',
          d.information||'',
          Array.isArray(d.informationSources) ? d.informationSources.join(', ') : (d.informationSources||''),
          d.informationSourceEtc||'',
          d.time||'', d.opportunityChosen||'', d.opportunityFlexible||'',
          d.eudaimonia_growth||'', d.eudaimonia_autonomy||'', d.eudaimonia_flow||'',
          d.eudaimonia_belonging||'', d.eudaimonia_meaning||''
        ]);
      });
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success', respondentId: respondentId
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error', message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok', service: 'HCCS-DRM Survey Backend'
  })).setMimeType(ContentService.MimeType.JSON);
}
