moment.locale('zh-cn');
var currentKeyword = '';

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

function renderStatus(statusText) {
  $('#status').text(statusText);
}

function startSearch() {
  const searchUrl = 'http://www.finedevelop.com:2016/rest/greenhopper/1.0/xboard/work/allData.json?rapidViewId=9';
  const result = document.getElementById('select');
  keyword = result.value;
  currentKeyword = keyword;
  renderStatus('搜索中......');
  ajax(searchUrl, function (result) {
    render(result, keyword);
    const links = document.getElementsByClassName('href');
    for (let i = 0; i < links.length; i++) {
      links[i].addEventListener('click', (e) => {
        const link = e.target.href;
        chrome.tabs.create({ url: link });
      })
    }
  }, function (errorMessage) {
    renderStatus(errorMessage);
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
    return item.assignee === 'vito' && item.statusName.indexOf(word) !== -1;
  });
  renderStatus('共' + filterResult.length + '项');
  filterResult.sort((a, b) => {
    if (moment(a.timeInColumn.enteredStatus).isAfter(moment(b.timeInColumn.enteredStatus))) {
      return -1;
    } else {
      return 1;
    }
  });
  const domArr = filterResult.map(item => {
    const article = document.createElement('article')
    const a = document.createElement('a');
    a.className = 'href';
    a.setAttribute('href', `http://www.finedevelop.com:2016/browse/${item.key}`);
    a.appendChild(document.createTextNode(`${item.key} ${item.summary}`));
    article.appendChild(a);

    const count = document.createElement('div');
    count.className = 'count';
    const answerCount = document.createElement('span');
    answerCount.className = 'answer-count';
    answerCount.appendChild(document.createTextNode(item.statusName));
    count.appendChild(answerCount);
    article.appendChild(count);

    const createTime = document.createElement('div');
    createTime.className = 'create-time';
    createTime.appendChild(document.createTextNode(moment(item.timeInColumn.enteredStatus).fromNow()));
    article.appendChild(createTime);

    const table = document.createElement('div');
    const tableString = item.extraFields[2].html.replace(/\/images\/border\//g, 'http://www.finedevelop.com:2016/images/border/')
    table.className = 'create-time';
    table.innerHTML = tableString;
    article.appendChild(table);

    return article;
  })
  domArr.forEach(item => {
    $resultDOM.append(item).append(document.createElement('br'))
  })
  $resultDOM.show();
  const tableGhp = document.getElementsByClassName('tt_graph');
  for (let i = 0; i < tableGhp.length; i++) {
    tableGhp[i].style.width = '100%';
  }
  const src = document.getElementsByClassName('hideOnPrint');
  for (let i = 0; i < src.length; i++) {
    src[i].style.height = '15px';
  }
}

document.addEventListener('DOMContentLoaded', function () {
  startSearch();
  document.getElementById('select').addEventListener('change', startSearch);
  document.onkeydown = (e) => {
    if (13 === e.keyCode) {
      startSearch();
    }
  }
});
