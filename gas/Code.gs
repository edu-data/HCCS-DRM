/* ======================================================
   HCCS-DRM Survey — Google Apps Script Backend
   3 Sheets: Responses, Episodes, Diagnosis
   ====================================================== */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const respondentId = 'R_' + new Date().getTime();
    const timestamp = data.timestamp || new Date().toISOString();

    // === Sheet 1: Responses (main survey data) ===
    let respSheet = ss.getSheetByName('Responses');
    if (!respSheet) {
      respSheet = ss.insertSheet('Responses');
      respSheet.appendRow([
        'RespondentID','Timestamp','PhoneNumber',
        // HCCS: Q1-Q12
        'Q1_SelectionFactor','Q2_CourseAvailability','Q3_Guidance','Q4_CareerLink',
        'Q5_Difficulties','Q6_SelectionImprovement',
        'Q7_AchievementUnderstanding','Q8_AchievementFairness','Q9_FiveTierSystem','Q10_IncompleteSystem',
        'Q11_AssessmentProblem','Q12_AssessmentImprovement',
        // Iloh Model: Q13-Q20
        'Q13_BiggestBarrier',
        'Q14_InfoAccess1','Q14_InfoAccess2','Q14_InfoAccess3',
        'Q15_InfoSources','Q16_InfoDesert',
        'Q17_TimeUse1','Q17_TimeUse2','Q17_TimeUse3','Q17_TimeUse4',
        'Q18_TimeDesign',
        'Q19_OppAccess1','Q19_OppAccess2','Q19_OppAccess3','Q19_OppAccess4',
        'Q20_OppImprovement',
        // Wellbeing: Q21-Q29
        'Q21_Growth','Q22_Autonomy','Q23_Flow','Q24_Belonging','Q25_Meaning',
        'Q26_WB_Happy','Q26_WB_Confident','Q26_WB_Growth','Q26_WB_Anxious','Q26_WB_Bored','Q26_WB_Depressed',
        'Q27_Satisfaction','Q28_IdealDay','Q29_FreeComment',
        // Basic Info
        'Grade','SchoolType','Region','HasSelectedCourse'
      ]);
    }

    const hccs = data.hccs || {};
    const gr = data.globalReflection || {};
    const wb = data.wellbeing || {};
    const bi = data.basicInfo || {};

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
    let epSheet = ss.getSheetByName('Episodes');
    if (!epSheet) {
      epSheet = ss.insertSheet('Episodes');
      epSheet.appendRow(['RespondentID','EpisodeID','StartTime','EndTime','Activity','Location','Companion']);
    }
    if (data.episodes && Array.isArray(data.episodes)) {
      data.episodes.forEach(function(ep) {
        epSheet.appendRow([respondentId, ep.id||'', ep.startTime||'', ep.endTime||'', ep.activity||'', ep.location||'', ep.companion||'']);
      });
    }

    // === Sheet 3: Diagnosis (with eudaimonia) ===
    let diagSheet = ss.getSheetByName('Diagnosis');
    if (!diagSheet) {
      diagSheet = ss.insertSheet('Diagnosis');
      diagSheet.appendRow([
        'RespondentID','EpisodeID','Activity',
        'Information','InfoSources','InfoSourceEtc',
        'Time','OpportunityChosen','OpportunityFlexible',
        'Eudaimonia_Growth','Eudaimonia_Autonomy','Eudaimonia_Flow','Eudaimonia_Belonging','Eudaimonia_Meaning'
      ]);
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
