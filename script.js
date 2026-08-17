function updateRangeInfo() {
  let start = Number($("startUnit").value);
  let end = Number($("endUnit").value);

  if (!start || !end) {
    $("rangeInfo").textContent = "Please enter a unit range from 1 to 50.";
    return;
  }

  if (start < 1 || start > 50 || end < 1 || end > 50) {
    $("rangeInfo").textContent = "Unit must be between 1 and 50.";
    return;
  }

  if (start > end) {
    [start, end] = [end, start];
  }

  const available = vocabulary.filter(
    v => v.unit >= start && v.unit <= end
  ).length;

  $("rangeInfo").textContent =
    `${available.toLocaleString()} words available in Units ${start}–${end}.`;
}
