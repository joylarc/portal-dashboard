function doGet(e) {
  if (e && e.parameter && e.parameter.id) {
    var doc = DocumentApp.openById(e.parameter.id);
    var html = convertDocToHtml(doc);
    return HtmlService.createHtmlOutput(html)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  var folderId = "140_C-CywfVmqY3z8MMT8IAk0hIvR9NW8";
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFilesByType(MimeType.GOOGLE_DOCS);

  var recipes = [];
  while (files.hasNext()) {
    var file = files.next();
    recipes.push({
      name: file.getName(),
      id: file.getId()
    });
  }

  recipes.sort(function(a, b) {
    return a.name.localeCompare(b.name);
  });

  var output = ContentService.createTextOutput(JSON.stringify(recipes));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function convertDocToHtml(doc) {
  var body = doc.getBody();
  var html = "<html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">";
  html += "<style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;font-size:18px;line-height:1.6;}";
  html += "h1{font-size:28px;}h2{font-size:24px;}h3{font-size:20px;}</style></head><body>";

  var numChildren = body.getNumChildren();
  for (var i = 0; i < numChildren; i++) {
    var child = body.getChild(i);
    html += elementToHtml(child);
  }

  html += "</body></html>";
  return html;
}

function elementToHtml(element) {
  var type = element.getType();

  if (type == DocumentApp.ElementType.PARAGRAPH) {
    var heading = element.getHeading();
    var text = renderText(element);
    if (heading == DocumentApp.ParagraphHeading.HEADING1) return "<h1>" + text + "</h1>";
    if (heading == DocumentApp.ParagraphHeading.HEADING2) return "<h2>" + text + "</h2>";
    if (heading == DocumentApp.ParagraphHeading.HEADING3) return "<h3>" + text + "</h3>";
    return "<p>" + text + "</p>";
  }

  if (type == DocumentApp.ElementType.LIST_ITEM) {
    return "<li>" + renderText(element) + "</li>";
  }

  return "";
}

function renderText(element) {
  var text = element.editAsText();
  var content = text.getText();
  if (!content) return "";

  var result = "";
  for (var i = 0; i < content.length; i++) {
    var char = content.charAt(i);
    if (char == "&") char = "&amp;";
    if (char == "<") char = "&lt;";
    if (char == ">") char = "&gt;";
    var bold = text.isBold(i);
    var italic = text.isItalic(i);
    if (bold) char = "<b>" + char + "</b>";
    if (italic) char = "<i>" + char + "</i>";
    result += char;
  }
  return result;
}
