moment.locale('zh-cn');
const URL_OPTION = {
  1: 'assignee',
  2: '开发者'
};

function ajax(url, callback, errorCallback) {
  const x = new XMLHttpRequest();
  x.open('GET', url, true);
  x.responseType = 'json';
  x.onload = function () {
    var response = x.response;
    if (!response || !response.issuesData || !response.issuesData.issues) {
      errorCallback('暂无答案');
      return;
    }
    var result = response.issuesData;
    callback(result);
  };
  x.onerror = function () {
    errorCallback('网络异常');
  };
  x.send();
}

function renderStatus(statusText, isFetching) {
  if (isFetching) {
    $('.spinner').show();
  }
  $('#status').text(statusText);
}

function stopTransition() {
  $('.spinner').hide();
}

function startQuery() {
  const condition = $('#condition').val();
  const keyword = $('#select').val();
  const searchUrl = 'http://www.finedevelop.com:2016/rest/greenhopper/1.0/xboard/work/allData.json?rapidViewId=9';
  renderStatus('正在拼命加载数据...', true);
  $.get('http://www.finedevelop.com:2016/rest/api/2/search', {
    jql: `${URL_OPTION[condition]} in (currentUser()) ORDER BY created DESC`
  }, (res) => {
    stopTransition();
    render(res, keyword);
  });
}

function render(result, keyword) {
  const $resultDOM = $('#result');
  $resultDOM.text('');
  const filterResult = result.issues.filter(item => {
    let word = '';
    if (keyword == 1) {
      word = '解决中';
    } else if (keyword == 2) {
      word = '已解决'
    }
    return item.fields.status.name.indexOf(word) !== -1;
  });
  renderStatus('共' + filterResult.length + '项');
  const itemArray = filterResult.map(item => {
    const $article = $('<article/>');
    $(`<a href="http://www.finedevelop.com:2016/browse/${item.key}" class="title_link">${item.key} ${item.fields.summary}<a/>`).appendTo($article);
    $(`<div class="count"/>`)
      .append($('<span class="answer-count"/>').text(item.fields.status.name))
      .append(' | ')
      .append($('<span class="create-time"/>').text(`${moment(item.fields.created).fromNow()}创建`))
      .append(' | ')
      .append($('<span class="create-time"/>').text(`${moment(item.fields.updated).fromNow()}更新`))
      .appendTo($article);
    const oriTime = `计划${item.fields.aggregatetimeoriginalestimate >= 28800 ? `${item.fields.aggregatetimeoriginalestimate / 28800}日` : `${item.fields.aggregatetimeoriginalestimate / 3600}小时`}`;
    const leftTime = `剩余${item.fields.timeestimate >= 28800 ? `${item.fields.timeestimate / 28800}日` : `${item.fields.timeestimate / 3600}小时`}`;
    $('<div class="timetracking">').text(`${oriTime} ${leftTime}`).appendTo($article);
    return $article;
  })
  itemArray.forEach(item => $resultDOM.append(item).append($('<br/>')));
  $('.tt_graph').width('100%');
  $('.hideOnPrint').height('15px');
  $resultDOM.show();
  $('.title_link').bind('click', (e) => {
    const link = e.target.href;
    chrome.tabs.create({ url: link });
  });
}

function init() {
  startQuery();
  initListener();
}

function initListener() {
  $('#select').bind('change', startQuery);
  $('#condition').bind('change', startQuery);
  $(document).bind('keydown', (e) => {
    if (13 === e.keyCode) {
      startQuery();
    }
  });
}

$(() => init());
