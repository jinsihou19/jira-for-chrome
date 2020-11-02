moment.locale('zh-cn');
const URL_OPTION = {
  1: 'assignee',
  2: '开发者'
};
const bitbucketUrl = 'https://code.fineres.com';
const TMSUrl = 'https://work.fineres.com';
const TMS_TOKEN = 'xxx'; // base64(用户名:token)
const Bitbucket_token = 'xxx'; // token

function renderStatus(statusText, isFetching) {
  if (isFetching) {
    $('.spinner').show();
  }
  $('#status').text(statusText);
}

function stopTransition() {
  $('.spinner').hide();
}

function openNewTab($href) {
  $href.bind('click', (e) => {
    const link = e.target.href;
    chrome.tabs.create({
      url: link
    });
  });
}

function startQuery() {
  const keyword = $('#select').val();
  renderStatus('正在拼命加载数据...', true);

  $.ajax({
    url: `${TMSUrl}/rest/api/2/search`,
    method: "GET",
    data: {
      jql: `assignee in (currentUser()) ORDER BY created DESC`
    },
    headers: {
      "Content-Type": "application/json;",
      "Authorization": `Basic ${TMS_TOKEN}`
    },
    success: (res, status) => {
      stopTransition();
      localStorage.setItem("result", JSON.stringify(res));
      render(res, keyword);
    }
  });
}

/**
 * 渲染任务界面
 * @param {Object} result  结果对象
 */
function render(result) {
  renderTab($('#tms-tab-unsolve'), result.issues.filter(item => item.fields.status.name.indexOf('解决中') !== -1))
  renderTab($('#tms-tab-distribution'), result.issues.filter(item => item.fields.status.name.indexOf('分配') !== -1))
  renderTab($('#tms-tab-solve'), result.issues.filter(item => item.fields.status.name.indexOf('已解决') !== -1))
  openNewTab($('.title_link'));
}

/**
 * 渲染一个tab页面
 * @param {jquery} $resultDOM 渲染的dom
 * @param {Array} tabData tab数据
 */
function renderTab($resultDOM, tabData) {
  $resultDOM.text('');
  const itemArray = tabData.map(item => {
    const $article = $('<article/>');
    $(`<a href="${TMSUrl}/browse/${item.key}" class="title_link">${item.key} ${item.fields.summary}<a/>`).appendTo($article);
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
  const $res = $('<div>');
  itemArray.forEach(item => $res.append(item).append($('<br/>')));
  $resultDOM.html($res);
  $('.tt_graph').width('100%');
  $('.hideOnPrint').height('15px');
  $resultDOM.show();
}

function getInbox() {
  $.ajax({
    url: `${bitbucketUrl}/rest/api/latest/inbox/pull-requests/count`,
    method: "GET",
    headers: {
      "Authorization": `Bearer ${Bitbucket_token}`
    },
    success: (res) => {
      if (res.count > 0) {
        $('.review-btn').append(`<span class="badge">${res.count}</span>`);
      }
    }
  });
}

function inboxInfo() {
  $('.git-area').show();
  $('.tms-area').hide();

  $.ajax({
    url: `${bitbucketUrl}/rest/api/latest/inbox/pull-requests?role=reviewer&start=0&limit=10&avatarSize=64&withAttributes=true&state=OPEN&order=oldest`,
    method: "GET",
    headers: {
      "Authorization": `Bearer ${Bitbucket_token}`
    },
    success: (res) => {
      const arr = res.values;
      if (arr.length > 0) {
        const content = arr.map(item => $('<tr>')
          .append(`<td class="repository">${item.fromRef.repository.name}-${item.fromRef.displayId}</td>`)
          .append(`<td class="title"><a class="title_link" href="${item.links.self[0].href}" title="${item.title}">${item.title}</a></td>`)
          .append(`<td><a href="${item.author.user.links.self[0].href}">${item.author.user.name}</a></td>`)
          .append(`<td>${item.author.user.name}</td>`));
        $('.review-table-content').append(content);
        openNewTab($('.title_link'));
      }
    }
  });
  $.ajax({
    url: `${bitbucketUrl}/rest/api/latest/inbox/pull-requests?role=author&start=0&limit=10&avatarSize=64&withAttributes=true&state=OPEN&order=oldest`,
    method: "GET",
    headers: {
      "Authorization": `Bearer ${Bitbucket_token}`
    },
    success: (res) => {
      const arr = res.values;
      if (arr.length > 0) {
        const content = arr.map(item => $('<tr>')
          .append(`<td class="repository">${item.fromRef.repository.name}-${item.fromRef.displayId}</td>`)
          .append(`<td class="title"><a class="title_link" href="${item.links.self[0].href}" title="${item.title}">${item.title}</a></td>`)
          .append(`<td><a href="${item.author.user.links.self[0].href}">${item.author.user.name}</a></td>`)
          .append(`<td>${item.author.user.name}</td>`));
        $('.author-table-content').append(content);
        openNewTab($('.title_link'));
      }
    }
  });
}

function initListener() {
  $('.tms-btn').click(() => {
    $('.git-area').hide();
    $('.tms-area').show();
  })
  $('.review-btn').click(inboxInfo);
  openNewTab($('.kms-btn'));
  $('#select').bind('change', startQuery);
  $('#condition').bind('change', startQuery);
  $('#quick-open').keydown((event) => {
    if (event.which == 13) {
      event.preventDefault();
      const link = `${TMSUrl}/browse/` + $('#quick-open').val();
      chrome.tabs.create({
        url: link
      });
    }
  })
  $('#refresh').click(startQuery);
}

function init() {
  getInbox();
  const res = localStorage.getItem("result");
  if (res !== null && res !== undefined) {
    render(JSON.parse(res));
  } else {
    startQuery();
  }
  initListener();
}

$(() => init());