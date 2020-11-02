## 计划
* 配置页面
* 更新界面，搜索，与我相关，收藏等

bitbucket服务器API记录

1. /rest/inbox/latest/pull-requests/count inbox需要review数量
2. /rest/inbox/latest/pull-requests?role=author&start=0&limit=10&avatarSize=64&withAttributes=true&state=OPEN&order=oldest 当前用户的review情况
3. /rest/inbox/latest/pull-requests?role=reviewer&start=0&limit=10&avatarSize=64&withAttributes=true&state=OPEN&order=oldest 请求review的情况 View your unapproved pull requestsbootstrap.min.js


jira server rest api :https://developer.atlassian.com/server/jira/platform/rest-apis/
bitbucket rest api:https://developer.atlassian.com/server/bitbucket/reference/plugin-module-types/plugin-modules/