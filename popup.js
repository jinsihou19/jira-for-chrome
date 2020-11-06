moment.locale('zh-cn');
const URL_OPTION = {
  1: 'assignee',
  2: '开发者'
};
const bitbucketUrl = 'https://code.fineres.com';
const TMSUrl = 'https://work.fineres.com';
const TMS_TOKEN = 'xxx'; // base64(用户名:token)
const Bitbucket_token = 'xxx'; // token
const wecomToken='xxx';

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

function JIRASearch({ url, data, success }) {
  $.ajax({
    url: url,
    method: "get",
    data: data,
    headers: {
      "Content-Type": "application/json;",
      "Authorization": `Basic ${TMS_TOKEN}`
    },
    success: success
  });
}

function startQuery() {
  renderStatus('正在拼命加载数据...', true);
  JIRASearch({
    url: `${TMSUrl}/rest/api/2/search`,
    data: {
      jql: `assignee in (currentUser()) ORDER BY created DESC`,
      fields: 'summary,status,created,updated,timespent,customfield_10904',
    },
    success: (res, status) => {
      stopTransition();
      localStorage.setItem("result", JSON.stringify(res));
      render(res);
    }
  });
}

/**
 * 对一组数据进行分数并计数
 * @param {Array} array 待分组的数组
 * @param {Function} f 分组的依据
 */
function groupBy(array, f) {
  let groups = {};
  array.forEach(function (o) {
    let group = f(o);
    groups[group] = groups[group] || [];
    groups[group].push(o);
  });
  return Object.keys(groups).map(group => ({ name: group, count: groups[group].length }));
}

function queryJQL() {
  chrome.storage.sync.get(['messageTitle', 'messageDeadline', 'messageJQL', 'messageLink'], (message) => queryCustom(message));
}

/**
 * 查询一个jql语句并渲染
 */
function queryCustom(message) {
  if (message === null || message === undefined) {
    renderTable($('#tms-tab-custbug'), { name: "没有获取到配置", count: 1 });
    return;
  }
  renderStatus('正在拼命加载数据...', true);
  JIRASearch({
    url: `${TMSUrl}/rest/api/2/search`,
    data: {
      jql: message.messageJQL,
      fields: 'assignee',
      maxResults: 200
    },
    success: (res, status) => {
      stopTransition();
      const list = res.issues;
      let custbugRes = groupBy(list, item => item.fields.assignee.name)
        .sort((a, b) => b.count - a.count);
      localStorage.setItem("custbugTotal", res.total);
      localStorage.setItem("custbugRes", JSON.stringify(custbugRes));
      const $custbug = $('#tms-tab-custbug');
      renderTable($custbug, custbugRes, message);
      $custbug.show();
    }
  });
}

/**
 * 渲染一个表格
 * @param {Jquery} $renderDOM 渲染的dom节点
 * @param {Array} data 两列的数组数据
 */
function renderTable($renderDOM, data, message) {
  $renderDOM.text('');
  const $tab = $('<div/>')
  const $sentWecomBtn = $('<button type="button" class="navbar-btn" id="send-wecom">').text("发送到企业微信").appendTo($tab);
  $sentWecomBtn.click(() => sendWecom(message));
  const $table = $('<table/>').appendTo($tab);
  data.forEach(i => $('<tr/>')
    .append($('<td/>').text(i.name))
    .append($('<td/>').text(i.count))
    .appendTo($table));
  $tab.appendTo($renderDOM);
}

/**
 * 发送到企业微信群机器人中
 */
function sendWecom(message) {
  renderStatus('正在推送到企业微信中...', true);
  const custbugStr = localStorage.getItem("custbugRes");
  if (custbugStr === null || custbugStr === undefined) {
    stopTransition();
    renderTable($('#tms-tab-custbug'), { name: "推送失败，没有找到数据", count: 1 })
    return;
  }
  const custbugList = JSON.parse(custbugStr);
  if (!Array.isArray(custbugList)) {
    stopTransition();
    renderTable($('#tms-tab-custbug'), { name: "推送失败，数据格式错误", count: 1 })
    return;
  }
  const total = localStorage.getItem("custbugTotal");
  let content = `${message.messageTitle} [${total}个](${message.messageLink}) ，截止日期到${message.messageDeadline}，请相关同学注意。\n`;
  custbugList.forEach(i => content += `>${i.name}: <font color=\"${i.count >= 5 ? 'warning' : 'comment'}\">${i.count}个</font>\n`)
  console.log(content)
  $.ajax({
    url: wecomToken,
    method: "post",
    data: JSON.stringify({
      "msgtype": "markdown",
      "markdown": {
        "content": content
      }
    }),
    headers: {
      "Content-Type": "application/json;"
    },
    success: () => {
      stopTransition();
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
    const oriTime = item.fields.timespent > 0 ? `已工作${item.fields.timespent >= 28800 ? `${item.fields.timespent / 28800}日` : `${item.fields.timespent / 3600}小时`}` : '未开始';
    const leftTime = item.fields.customfield_10904 == null ? '无截止日期' : `${moment(item.fields.customfield_10904).fromNow()}截止`
    // const oriTime = `计划${item.fields.aggregatetimeoriginalestimate >= 28800 ? `${item.fields.aggregatetimeoriginalestimate / 28800}日` : `${item.fields.aggregatetimeoriginalestimate / 3600}小时`}`;
    // const leftTime = `剩余${item.fields.timeestimate >= 28800 ? `${item.fields.timeestimate / 28800}日` : `${item.fields.timeestimate / 3600}小时`}`;
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
        chrome.browserAction.setBadgeText({ text: '' + res.count });
        chrome.browserAction.setBadgeBackgroundColor({ color: '#4688F1' });
      }
    }
  });
}

function inboxInfo() {
  $('.git-area').show();
  $('.tms-area').hide();
  chrome.browserAction.setBadgeText({ text: '' });

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
  // $('#select').bind('change', startQuery);
  // $('#condition').bind('change', startQuery);
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
  $('#query-jql').click(queryJQL);
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