let node_statuses = [false, false, false, false]
let byz_num = 0;

$('#num-field').on('change', update_node)


$(window).on('load', function() {
    pop_node_until(node_statuses.length, -1);
    update_node()
    $('#next-btn').prop('disabled', true)
    $('#prev-btn').prop('disabled', true)


    total_rounds = 0;
    cur_step = 0;
    cur_round = 0;
})

function update_node() {
    let current_count = parseInt($('#num-field').val());
    if (current_count > 10) {
        $('#warn_modal').modal('show')
        $('#num-field').val(10)
        return
    }
    if (current_count <= 0)
        return
    
    if (current_count >= node_statuses.length) {
        add_node_until(node_statuses.length, current_count);
    }
    else {
        pop_node_until(node_statuses.length, current_count);
    }
    $('#node-count').text(`${node_statuses.length}`)
    update_warn_msg()
}

function add_node_until(start_node_id, target_num) {
    for(let i = start_node_id; i < target_num; i++) {
        let node_name = (i == 0) ? "Commander" : `Node ${i}`
        $('#node-inp-container').append(`
            <div class="col">
                <div class="form-check-reverse text-start my-2 mx-2 py-2 ps-3 pe-5 border border-2 border-dark rounded">
                    <input class="form-check-input" type="checkbox" id="byz-node${i}" onchange="byz_node_check_handler(event)" value="">
                    <label class="form-check-label w-100" for="byz-node${i}">${node_name}</label>
                </div>
            </div>
        `)
        node_statuses.push(false);
    }
}

function pop_node_until(start_node, target_node) {
    for(let i = start_node; i > target_node; i--) {
        $('#node-inp-container').children().last().remove()
        node_statuses.pop()
    }
}
function byz_node_check_handler(e) {
    let nodeIdx = parseInt(e.target.id.substring('byz-node'.length))
    if (e.target.checked) {
        if(byz_num > 10) {
            $('#warn_modal').modal('show')
            e.target.checked = false;
            return
        }

        node_statuses[nodeIdx] = true
        byz_num++
    } else {
        node_statuses[nodeIdx] = false
        byz_num--
    }

    update_warn_msg()
}

function update_warn_msg() {
    // let byz_number = node_statuses.reduce((a, b) => a + b, 0)
    let is_hide_warn = 3 * byz_num + 1 <= node_statuses.length
    $('#byz-warn').attr('hidden', is_hide_warn)

    $('#byz-count').text(`${byz_num}`)
}


// result handler
let consensus_result = []
let max_step_per_rounds = []
let total_rounds = 0;
let cur_step = 0;
let cur_round = 0;
$('#start-btn').on('click', function() {
    $('#next-btn').prop('disabled', true)
    $('#prev-btn').prop('disabled', true)
    $('#skip-btn').prop('disabled', true)
    $('#reset-btn').prop('disabled', true)
    $('#konsensus-status').text('Sedang Berjalan')
    consensus_result = []
    max_step_per_rounds = []

    total_rounds = node_statuses.reduce((a, b) => a + b, 2);
    cur_step = 0;
    cur_round = 0;

    let order = ($('#attack').is(':checked')) ? "A" : "R";
    let data = {
        "statuses": node_statuses,
        "order": order
    }
    create_node_result()
    $.ajax({
        type: 'POST',
        dataType: 'json',
        url: "api/om/",
        data: JSON.stringify(data),
        success: function(response) {
            $('#reset-btn').prop('disabled', false)
            $('#skip-btn').prop('disabled', false)
            $('#next-btn').prop('disabled', false)
            $('#prev-btn').prop('disabled', false)
            consensus_result = response
            determine_max_iter()
            $('#konsensus-status').text('Tercapai')            
        }
    })

})

function determine_max_iter() {
    
    let max_round = 0;

    for(let node = 0; node < node_statuses.length; node++) {
        let node_round = Object.keys(consensus_result[node]['logs']).length - 1
        if (node_round > max_round)
            max_round = node_round;
    }

    total_rounds = max_round + 2;

    max_step_per_rounds[0] = 1;
    for(let round = 1; round < total_rounds - 1; round++) {
        max_step_per_rounds[round] = 0;

        for(let i = 0; i < node_statuses.length; i++) {
            let cur_node_logs = consensus_result[i]['logs']
            let steps = cur_node_logs[round - 1] || {}
            let num_step = Object.keys(steps).length;
            
            if (num_step > max_step_per_rounds[round]) {
                max_step_per_rounds[round] = num_step
            }
        }
    }
    max_step_per_rounds.push(1)
    total_rounds = max_step_per_rounds.length;
}

$('#reset-btn').on('click', function() {
    cur_round = 0
    cur_step = 0

    update_consensus_result(false)
    $('#prev-btn').prop('disabled', true)
    $('#next-btn').prop('disabled', false)
})

$('#skip-btn').on('click', function() {
    cur_round = total_rounds - 1
    cur_step = 0

    update_consensus_result(true)
    $('#prev-btn').prop('disabled', false)
    $('#next-btn').prop('disabled', true)
})

$('#next-btn').on('click', function() {
    cur_step += 1
    if (cur_step == max_step_per_rounds[cur_round]) {
        cur_round += 1
        cur_step = 0
    }
    if (cur_round == total_rounds - 1) {
        update_consensus_result(true)
        $('#next-btn').prop('disabled', true)
    }
    $('#prev-btn').prop('disabled', false)
})

$('#prev-btn').on('click', function() {
    
    cur_step -= 1
    if(cur_step < 0) {
        cur_round -= 1
        cur_step = max_step_per_rounds[cur_round] - 1
    }

    if($('#next-btn').prop('disabled')) {
        update_consensus_result(false)
    }
    if (cur_round == 0) {
        $('#prev-btn').prop('disabled', true)
    }

    $('#next-btn').prop('disabled', false)

})

function create_modal_logs(node_id) {
    $('#log0content').empty()

    let node_name = (node_id == 0) ? 'Commander' : `Node ${node_id}`
    $('#log0Label').text(`Log ${node_name}`)

    if (!consensus_result[node_id]) {
        $('#log0content').append("Log belum tersedia <br> Konsesus sedang berjalan")    
        $('#log0').modal('show')
        return
    }

    let logs = consensus_result[node_id]['logs']
    let idx = 1

    $('#log0content').append(`<h5>Round: ${cur_round + 1} of ${total_rounds} | Step: ${cur_step + 1} of ${max_step_per_rounds[cur_round]}</h5>`)
    
    for(let round = 0; round < cur_round - 1; round++) {
        for(let step = 0; step <= max_step_per_rounds[round + 1]; step++) {
            if(logs[round] && logs[round][step]) {
                
                logs[round][step].forEach(log => {
                    $('#log0content').append(`<p>${idx}. ${log}</p>`)
                    idx += 1
                })
            }
        }
    }

    let real_step = (cur_round > 1) ? cur_step + 1: cur_step;
    if(logs[cur_round - 1]) {
        for(let step = 0; step <= real_step; step++) {
            if (logs[cur_round - 1] && logs[cur_round - 1][step]) {
                logs[cur_round - 1][step].forEach(log => {
                    $('#log0content').append(`<p>${idx}. ${log}</p>`)
                    idx += 1
                })
            }
        }
    }
    if(cur_round == total_rounds - 1) {
        if (!logs["C"]["C"][1]) {
            $('#log0content').append(`<br><p>Conclusion: ${logs["C"]["C"][0]}</p>`)
        }
        else {
            $('#log0content').append(`<br><p>Summary: ${logs["C"]["C"][0]}</p>`)
            $('#log0content').append(`<p>Conclusion: ${logs["C"]["C"][1]}</p>`)
        }
    }

    $('#log0').modal('show')
}

function update_consensus_result(is_next) {
    $('#result-container > .col > button').each((i, element) => {
        let is_byz = node_statuses[i];

        let btn_type = (is_byz) ? 'danger' : (is_next) ? ((consensus_result[i]['conclusion'] == 'ATTACK') ? 'success' : 'info') : 'secondary';
        let con_result = (is_byz) ? 'Byzantine' : (is_next) ? consensus_result[i]['conclusion'] : 'Undecided';
        let node_name = (i == 0) ? 'Commander' : `Node ${i}`;
        
        element.className = `btn btn-${btn_type} my-2 mx-1 py-2 border border-3 border-dark rounded w-100 fw-bold`
        element.innerHTML = `${node_name} | <span>${con_result}</span>`
    })
}

function create_node_result() {
    $('#result-container').empty();
    for (let i = 0; i < node_statuses.length; i++){
        let is_byz = node_statuses[i];
        let btn_type = (is_byz) ? 'danger' : 'secondary';
        let con_result = (is_byz) ? 'Byzantine' : 'Undecided';
        let node_name = (i == 0) ? 'Commander' : `Node ${i}`;
        $('#result-container').append(`
            <div class="col">
                <button class="btn btn-${btn_type} my-2 mx-1 py-2 border border-3 border-dark rounded w-100 fw-bold" 
                    type="button" onclick="create_modal_logs(${i})">
                    ${node_name} | <span>${con_result}</span>
                </button>
            </div>
        `)
    }
}