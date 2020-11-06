function renderStatus(statusText, isFetching) {
    if (isFetching) {
        $('.spinner').show();
    }
    $('#status').text(statusText);
}

function stopTransition() {
    $('.spinner').hide();
    $('#status').text('');
}

function restore_options() {
    renderStatus("加载配置中...", true)
    chrome.storage.sync.get(['messageTitle', 'messageDeadline', 'messageJQL', 'messageLink'], function (item) {
        stopTransition();
        $('#message-title').val(item.messageTitle);
        $('#message-deadline').val(item.messageDeadline);
        $('#message-jql').val(item.messageJQL);
        $('#message-link').val(item.messageLink);
    });
}

function init() {
    restore_options();
    $('#save-options').click(() => {
        const messageTitle = $('#message-title').val();
        const messageDeadline = $('#message-deadline').val();
        const messageJQL = $('#message-jql').val();
        const messageLink = $('#message-link').val();

        renderStatus("保存中...", true)
        chrome.storage.sync.set({
            messageTitle,
            messageDeadline,
            messageJQL,
            messageLink
        }, function (res) {
            stopTransition();
            $('#status').text('保存成功。');
            setTimeout(function () {
                $('#status').text('');
            }, 750);
        });
    })
}


$(() => init());