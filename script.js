$(function() {
	// заполняем шаблонный текст
	var s = "";
	for(var i=0; i<1000; i++) {
		s+="%IMG1%\r\n"
	}
	s = s.slice(0, -2);
	$('#element_replacetext').val(s);
	$('#element_replacetext').select();

	$("#element_template_count").change(function() {
		// сначала удаляем старые
		var li_urls_img = $("#li_urls_img1");
		var li_count_img = $("#li_count_img1");
		var li_wrap_tag = $("#li_wrap_img1");

		$("[id^=li_urls_img]").not(li_urls_img).remove();
		$("[id^=li_count_img]").not(li_count_img).remove();
		$("[id^=li_wrap_img]").not(li_wrap_tag).remove();

		// получаем количество шаблонов
		var count = parseInt($("#element_template_count").val());

		// добавляем
		for(var i = 2; i < count+1; i++) {
			$('#result_options').before((li_urls_img[0].outerHTML+li_wrap_tag[0].outerHTML+li_count_img[0].outerHTML).replace(/img1/g, "img"+i).replace(/%IMG1%/g, "%IMG"+i+"%"))
		}
	});
	$("#element_template_count").change();

	$('form').submit(function() {
		function showError(text) {
			$('<li id="error_message"><p id="error_message_title">Была найдена ошибка:</p><p id="error_message_desc">'+text+'</p></li>').insertAfter('#li_all_results');
			return false;
		}

		// удаляем предыдущее сообщение об ошибке
		$('#error_message').remove();

		// удаляем поля результатов
		var li_result = $("#li_result1");
		$("[id^=li_result]").not(li_result).remove();
		$("#element_result1").val("");

		// удаляем пустую последнюю строку и получаем элементы
		var spoiler_list_generator_text = $("#element_spoiler_list_generator_text").val().replace(/\r\n$|\r$|\n$/g, '');
		var lines = spoiler_list_generator_text.split(/\r\n|\r|\n/); 
		lines_count = (lines)?lines.length:0;

		var items_count = spoiler_list_generator_text.match(/%IMG1%/g);
		items_count = (items_count)?items_count.length:0;

		if (!lines_count) return showError("Не обнаружены элементы (проверьте, вставлен ли результат работы SpoilerListGenerator)");
		if (!items_count) return showError("Не обнаружено использование <b>%IMG1%</b> (проверьте, вставлен ли результат работы SpoilerListGenerator)");
		if (lines_count%items_count) return showError("Количество строк в результате работы SpoilerListGenerator должно быть кратно количеству использований <b>%IMG1%</b>. Может быть вставили не весь текст?")

		var step = lines_count/items_count;
		var elements = {};
		var errors = [];

		// проверяем ссылки
		$("[id^=element_urls_img]").each(function(i, e) {
			var id = e.id.split('_').pop();
			var urls = $('#element_urls_'+id).val().match(/(\[url=.*?\[\/url\])/ig);
			if (!urls) {
				urls = $('#element_urls_'+id).val().match(/(\[img\].*?\[\/img\])/ig);
			}
			if (!urls) {
				urls = $('#element_urls_'+id).val().match(/(https?:\/\/[^\s\[\]]+)/ig);
				if (urls) {
					if ($('#element_wrap_'+id).is(':checked')) {
						urls = urls.map(function(e) {return "[img]"+e+"[/img]"});
					} else {
						urls = urls.map(function(e) {return e+" "});
					}
				}
			}

			if (urls) {
				if (urls.length%items_count) errors.push("Количество строк в результате работы SpoilerListGenerator должно быть кратно количеству использований <b>%"+id.toUpperCase()+"%</b>. Может быть вставили не весь текст?");
				elements[id] = {};
				elements[id].urls = urls;
				elements[id].splitby = parseInt($("#element_count_"+id).val()) || 0;
				elements[id].step = elements[id].urls.length/items_count;
			}
		});

		if (errors.length) return showError(errors.join('<br>'));

		var rows = [];
		var elkeys = Object.keys(elements);
		var ell = elkeys.length;

		// производим замену
		for(var i=0; i<items_count;i++) {
			var row = lines.slice(i*step, (i+1)*step).join('\r\n');
			for(var j=0; j<ell; j++) {
				var id=elkeys[j];
				var urls = elements[id].urls.slice(i*elements[id].step, (i+1)*elements[id].step);
				var splitby = elements[id].splitby;
				if (splitby) {
					var parts=[];
					for(var k=0; k<urls.length;k+=splitby) {
						parts.push(urls.slice(k, k+splitby).join(''));
					}
					urls = parts.join('\r\n');
				} else {
					urls = urls.join('');
				}
				row = row.replace(new RegExp("%"+id.toUpperCase()+"%", "g"), urls);
			}
			rows.push(row);
		}

		// делаем разбивку
		var split_by_symbols = parseInt($("#element_split_by_symbols").val()) || 0;
		var split_by_items = parseInt($("#element_split_by_items").val()) || 0;
		var offset_first_post = parseInt($("#element_offset_first_post").val()) || 0;

		// по 2 символа на длину total и current
		var wrap_result_with = $.trim($("#element_wrap_result_with").val());
		var wrap_result_with_length = wrap_result_with
													.replace(/%CURRENT%/g, "")
													.replace(/%TOTAL%/g, "")
													.replace(/%RESULT%/g, "")
													.length+4;
													
		// Если надо обрамлять. то максимальная длина символов уменьшается
		var max_length = (wrap_result_with)?(split_by_symbols-wrap_result_with_length):split_by_symbols;

		// return last index in rows (for slice)
		function symbol_split(rows, max_symbols) {
			var total_length = 0;
			for(var i=0; i<rows.length; i++) {
				total_length += rows[i].length + 2; // include \r\n
				if (total_length > max_symbols) return i;
			}
			return rows.length;
		}

		// return last index in rows  (for slice)
		function items_split(rows, max_rows, max_symbols) {
			 var arr = rows.slice(0, max_rows);
			 if (max_symbols && arr.join("\r\n").length > max_symbols) 
			 	return symbol_split(rows, max_symbols)
			 else 
			 	return max_rows;
		}

		var results = [];
		var i=0;
		var idx;
		while(i<rows.length) {
			if (split_by_symbols && split_by_items) 
				idx = i+items_split(rows.slice(i), split_by_items, (i)?max_length:(max_length-offset_first_post))
			else if (split_by_items) 
				idx = i+items_split(rows.slice(i), split_by_items, 0)
			else if (split_by_symbols)
				idx = i+symbol_split(rows.slice(i), (i)?split_by_symbols:(max_length-offset_first_post))
			else
				idx = rows.length;

			if (i==idx) return showError("Один из элементов получается длиннее, чем разрешенное количество символов.<br>Проверьте элементы и ограничения");
			results.push(rows.slice(i, idx));
			i = idx;
		}		

		// создаем дополнительные textbox
		$(li_result).remove();
		if (results.length > 0) {
			for(var i=1; i<results.length+1; i++) 
				$("form ul").append(li_result[0].outerHTML
					.replace(/result1/g, 'result'+i)
					.replace(/часть \d+ из \d+/g, 
						"часть "+i+" из "+(results.length)));
		}

		// заполняем результаты textbox
		if (results.length) {
			for (var i=0;i<results.length;i++) {
				var text = results[i].join("\r\n");
				if (wrap_result_with) {
					text = wrap_result_with
					.replace(/%CURRENT%/g, i+1)
					.replace(/%TOTAL%/g, results.length)
					.replace(/%RESULT%/g, text);
				}
				$("#element_result"+(i+1)).val(text);
			}
		}

		return false;
	});
});