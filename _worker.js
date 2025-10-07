
// 部署完成后在网址后面加上这个，获取自建节点和机场聚合节点，/?token=auto或/auto或

let mytoken = 'auto';
let guestToken = ''; //可以随便取，或者uuid生成，https://1024tools.com/uuid
let BotToken = ''; //可以为空，或者@BotFather中输入/start，/newbot，并关注机器人
let ChatID = ''; //可以为空，或者@userinfobot中获取，/start
let TG = 0; //小白勿动， 开发者专用，1 为推送所有的访问信息，0 为不推送订阅转换后端的访问信息与异常访问
let FileName = 'CF-Workers-SUB';
let SUBUpdateTime = 6; //自定义订阅更新时间，单位小时
let total = 99;//TB
let timestamp = 4102329600000;//2099-12-31
let adminToken = 'admin_' + mytoken; // 管理员token

//节点链接 + 订阅链接
let MainData = `
https://cfxr.eu.org/getSub
`;

let urls = [];
let subConverter = "SUBAPI.cmliussss.net"; //在线订阅转换后端，目前使用CM的订阅转换功能。支持自建psub 可自行搭建https://github.com/bulianglin/psub
let subConfig = "https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_MultiCountry.ini"; //订阅配置文件
let subProtocol = 'https';

export default {
	async fetch(request, env) {
		const userAgentHeader = request.headers.get('User-Agent');
		const userAgent = userAgentHeader ? userAgentHeader.toLowerCase() : "null";
		const url = new URL(request.url);
		const token = url.searchParams.get('token');
		mytoken = env.TOKEN || mytoken;
		BotToken = env.TGTOKEN || BotToken;
		ChatID = env.TGID || ChatID;
		TG = env.TG || TG;
		subConverter = env.SUBAPI || subConverter;
		if (subConverter.includes("http://")) {
			subConverter = subConverter.split("//")[1];
			subProtocol = 'http';
		} else {
			subConverter = subConverter.split("//")[1] || subConverter;
		}
		subConfig = env.SUBCONFIG || subConfig;
		FileName = env.SUBNAME || FileName;

		const currentDate = new Date();
		currentDate.setHours(0, 0, 0, 0);
		const timeTemp = Math.ceil(currentDate.getTime() / 1000);
		const fakeToken = await MD5MD5(`${mytoken}${timeTemp}`);
		guestToken = env.GUESTTOKEN || env.GUEST || guestToken;
		if (!guestToken) guestToken = await MD5MD5(mytoken);
		const 访客订阅 = guestToken;
		
		// 获取管理员token
		adminToken = env.ADMINTOKEN || adminToken;
		//console.log(`${fakeUserID}\n${fakeHostName}`); // 打印fakeID

		let UD = Math.floor(((timestamp - Date.now()) / timestamp * total * 1099511627776) / 2);
		total = total * 1099511627776;
		let expire = Math.floor(timestamp / 1000);
		SUBUpdateTime = env.SUBUPTIME || SUBUpdateTime;

		// 检查是否为管理员访问
		if (token === adminToken || url.pathname === ("/" + adminToken)) {
			if (userAgent.includes('mozilla')) {
				await sendMessage(`#管理员访问 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgentHeader}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);
				return await AdminPanel(request, env);
			}
		}
		
		// 获取所有有效的访客token
		const validGuestTokens = await getValidGuestTokens(env);
		const isValidGuestToken = validGuestTokens.includes(token);

		if (!([mytoken, fakeToken, 访客订阅].includes(token) || isValidGuestToken || url.pathname == ("/" + mytoken) || url.pathname.includes("/" + mytoken + "?"))) {
			if (TG == 1 && url.pathname !== "/" && url.pathname !== "/favicon.ico") await sendMessage(`#异常访问 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgent}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);
			if (env.URL302) return Response.redirect(env.URL302, 302);
			else if (env.URL) return await proxyURL(env.URL, url);
			else return new Response(await nginx(), {
				status: 200,
				headers: {
					'Content-Type': 'text/html; charset=UTF-8',
				},
			});
		} else {
			// 记录访问日志
			if (token && token !== mytoken && token !== fakeToken) {
				await logTokenAccess(env, token, request.headers.get('CF-Connecting-IP'), userAgent);
			}
			
			if (env.KV) {
				await 迁移地址列表(env, 'LINK.txt');
				if (userAgent.includes('mozilla') && !url.search) {
					await sendMessage(`#编辑订阅 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgentHeader}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);
					return await KV(request, env, 'LINK.txt', 访客订阅);
				} else {
					MainData = await env.KV.get('LINK.txt') || MainData;
				}
			} else {
				MainData = env.LINK || MainData;
				if (env.LINKSUB) urls = await ADD(env.LINKSUB);
			}
			let 重新汇总所有链接 = await ADD(MainData + '\n' + urls.join('\n'));
			let 自建节点 = "";
			let 订阅链接 = "";
			for (let x of 重新汇总所有链接) {
				if (x.toLowerCase().startsWith('http')) {
					订阅链接 += x + '\n';
				} else {
					自建节点 += x + '\n';
				}
			}
			MainData = 自建节点;
			urls = await ADD(订阅链接);
			await sendMessage(`#获取订阅 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgentHeader}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);
			const isSubConverterRequest = request.headers.get('subconverter-request') || request.headers.get('subconverter-version') || userAgent.includes('subconverter');
			let 订阅格式 = 'base64';
			if (!(userAgent.includes('null') || isSubConverterRequest || userAgent.includes('nekobox') || userAgent.includes(('CF-Workers-SUB').toLowerCase()))) {
				if (userAgent.includes('sing-box') || userAgent.includes('singbox') || url.searchParams.has('sb') || url.searchParams.has('singbox')) {
					订阅格式 = 'singbox';
				} else if (userAgent.includes('surge') || url.searchParams.has('surge')) {
					订阅格式 = 'surge';
				} else if (userAgent.includes('quantumult') || url.searchParams.has('quanx')) {
					订阅格式 = 'quanx';
				} else if (userAgent.includes('loon') || url.searchParams.has('loon')) {
					订阅格式 = 'loon';
				} else if (userAgent.includes('clash') || userAgent.includes('meta') || userAgent.includes('mihomo') || url.searchParams.has('clash')) {
					订阅格式 = 'clash';
				}
			}

			let subConverterUrl;
			let 订阅转换URL = `${url.origin}/${await MD5MD5(fakeToken)}?token=${fakeToken}`;
			//console.log(订阅转换URL);
			let req_data = MainData;

			let 追加UA = 'v2rayn';
			if (url.searchParams.has('b64') || url.searchParams.has('base64')) 订阅格式 = 'base64';
			else if (url.searchParams.has('clash')) 追加UA = 'clash';
			else if (url.searchParams.has('singbox')) 追加UA = 'singbox';
			else if (url.searchParams.has('surge')) 追加UA = 'surge';
			else if (url.searchParams.has('quanx')) 追加UA = 'Quantumult%20X';
			else if (url.searchParams.has('loon')) 追加UA = 'Loon';

			const 订阅链接数组 = [...new Set(urls)].filter(item => item?.trim?.()); // 去重
			if (订阅链接数组.length > 0) {
				const 请求订阅响应内容 = await getSUB(订阅链接数组, request, 追加UA, userAgentHeader);
				console.log(请求订阅响应内容);
				req_data += 请求订阅响应内容[0].join('\n');
				订阅转换URL += "|" + 请求订阅响应内容[1];
				if (订阅格式 == 'base64' && !isSubConverterRequest && 请求订阅响应内容[1].includes('://')) {
					subConverterUrl = `${subProtocol}://${subConverter}/sub?target=mixed&url=${encodeURIComponent(请求订阅响应内容[1])}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
					try {
						const subConverterResponse = await fetch(subConverterUrl, { headers: { 'User-Agent': 'v2rayN/CF-Workers-SUB  (https://github.com/cmliu/CF-Workers-SUB)' } });
						if (subConverterResponse.ok) {
							const subConverterContent = await subConverterResponse.text();
							req_data += '\n' + atob(subConverterContent);
						}
					} catch (error) {
						console.log('订阅转换请回base64失败，检查订阅转换后端是否正常运行');
					}
				}
			}

			if (env.WARP) 订阅转换URL += "|" + (await ADD(env.WARP)).join("|");
			//修复中文错误
			const utf8Encoder = new TextEncoder();
			const encodedData = utf8Encoder.encode(req_data);
			//const text = String.fromCharCode.apply(null, encodedData);
			const utf8Decoder = new TextDecoder();
			const text = utf8Decoder.decode(encodedData);

			//去重
			const uniqueLines = new Set(text.split('\n'));
			const result = [...uniqueLines].join('\n');
			//console.log(result);

			let base64Data;
			try {
				base64Data = btoa(result);
			} catch (e) {
				function encodeBase64(data) {
					const binary = new TextEncoder().encode(data);
					let base64 = '';
					const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

					for (let i = 0; i < binary.length; i += 3) {
						const byte1 = binary[i];
						const byte2 = binary[i + 1] || 0;
						const byte3 = binary[i + 2] || 0;

						base64 += chars[byte1 >> 2];
						base64 += chars[((byte1 & 3) << 4) | (byte2 >> 4)];
						base64 += chars[((byte2 & 15) << 2) | (byte3 >> 6)];
						base64 += chars[byte3 & 63];
					}

					const padding = 3 - (binary.length % 3 || 3);
					return base64.slice(0, base64.length - padding) + '=='.slice(0, padding);
				}

				base64Data = encodeBase64(result)
			}

			// 构建响应头对象
			const responseHeaders = {
				"content-type": "text/plain; charset=utf-8",
				"Profile-Update-Interval": `${SUBUpdateTime}`,
				"Profile-web-page-url": request.url.includes('?') ? request.url.split('?')[0] : request.url,
				//"Subscription-Userinfo": `upload=${UD}; download=${UD}; total=${total}; expire=${expire}`,
			};

			if (订阅格式 == 'base64' || token == fakeToken) {
				return new Response(base64Data, { headers: responseHeaders });
			} else if (订阅格式 == 'clash') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=clash&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
			} else if (订阅格式 == 'singbox') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=singbox&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
			} else if (订阅格式 == 'surge') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=surge&ver=4&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
			} else if (订阅格式 == 'quanx') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=quanx&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&udp=true`;
			} else if (订阅格式 == 'loon') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=loon&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false`;
			}
			//console.log(订阅转换URL);
			try {
				const subConverterResponse = await fetch(subConverterUrl, { headers: { 'User-Agent': userAgentHeader } });//订阅转换
				if (!subConverterResponse.ok) return new Response(base64Data, { headers: responseHeaders });
				let subConverterContent = await subConverterResponse.text();
				if (订阅格式 == 'clash') subConverterContent = await clashFix(subConverterContent);
				// 只有非浏览器订阅才会返回SUBNAME
				if (!userAgent.includes('mozilla')) responseHeaders["Content-Disposition"] = `attachment; filename*=utf-8''${encodeURIComponent(FileName)}`;
				return new Response(subConverterContent, { headers: responseHeaders });
			} catch (error) {
				return new Response(base64Data, { headers: responseHeaders });
			}
		}
	}
};

async function ADD(envadd) {
	var addtext = envadd.replace(/[	"'|\r\n]+/g, '\n').replace(/\n+/g, '\n');	// 替换为换行
	//console.log(addtext);
	if (addtext.charAt(0) == '\n') addtext = addtext.slice(1);
	if (addtext.charAt(addtext.length - 1) == '\n') addtext = addtext.slice(0, addtext.length - 1);
	const add = addtext.split('\n');
	//console.log(add);
	return add;
}

async function nginx() {
	const text = `
	<!DOCTYPE html>
	<html>
	<head>
	<title>Welcome to nginx!</title>
	<style>
		body {
			width: 35em;
			margin: 0 auto;
			font-family: Tahoma, Verdana, Arial, sans-serif;
		}
	</style>
	</head>
	<body>
	<h1>Welcome to nginx!</h1>
	<p>If you see this page, the nginx web server is successfully installed and
	working. Further configuration is required.</p>
	
	<p>For online documentation and support please refer to
	<a href="http://nginx.org/">nginx.org</a>.<br/>
	Commercial support is available at
	<a href="http://nginx.com/">nginx.com</a>.</p>
	
	<p><em>Thank you for using nginx.</em></p>
	</body>
	</html>
	`
	return text;
}

async function sendMessage(type, ip, add_data = "") {
	if (BotToken !== '' && ChatID !== '') {
		let msg = "";
		const response = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`);
		if (response.status == 200) {
			const ipInfo = await response.json();
			msg = `${type}\nIP: ${ip}\n国家: ${ipInfo.country}\n<tg-spoiler>城市: ${ipInfo.city}\n组织: ${ipInfo.org}\nASN: ${ipInfo.as}\n${add_data}`;
		} else {
			msg = `${type}\nIP: ${ip}\n<tg-spoiler>${add_data}`;
		}

		let url = "https://api.telegram.org/bot" + BotToken + "/sendMessage?chat_id=" + ChatID + "&parse_mode=HTML&text=" + encodeURIComponent(msg);
		return fetch(url, {
			method: 'get',
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;',
				'Accept-Encoding': 'gzip, deflate, br',
				'User-Agent': 'Mozilla/5.0 Chrome/90.0.4430.72'
			}
		});
	}
}

function base64Decode(str) {
	const bytes = new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));
	const decoder = new TextDecoder('utf-8');
	return decoder.decode(bytes);
}

async function MD5MD5(text) {
	const encoder = new TextEncoder();

	const firstPass = await crypto.subtle.digest('MD5', encoder.encode(text));
	const firstPassArray = Array.from(new Uint8Array(firstPass));
	const firstHex = firstPassArray.map(b => b.toString(16).padStart(2, '0')).join('');

	const secondPass = await crypto.subtle.digest('MD5', encoder.encode(firstHex.slice(7, 27)));
	const secondPassArray = Array.from(new Uint8Array(secondPass));
	const secondHex = secondPassArray.map(b => b.toString(16).padStart(2, '0')).join('');

	return secondHex.toLowerCase();
}

function clashFix(content) {
	if (content.includes('wireguard') && !content.includes('remote-dns-resolve')) {
		let lines;
		if (content.includes('\r\n')) {
			lines = content.split('\r\n');
		} else {
			lines = content.split('\n');
		}

		let result = "";
		for (let line of lines) {
			if (line.includes('type: wireguard')) {
				const 备改内容 = `, mtu: 1280, udp: true`;
				const 正确内容 = `, mtu: 1280, remote-dns-resolve: true, udp: true`;
				result += line.replace(new RegExp(备改内容, 'g'), 正确内容) + '\n';
			} else {
				result += line + '\n';
			}
		}

		content = result;
	}
	return content;
}

async function proxyURL(proxyURL, url) {
	const URLs = await ADD(proxyURL);
	const fullURL = URLs[Math.floor(Math.random() * URLs.length)];

	// 解析目标 URL
	let parsedURL = new URL(fullURL);
	console.log(parsedURL);
	// 提取并可能修改 URL 组件
	let URLProtocol = parsedURL.protocol.slice(0, -1) || 'https';
	let URLHostname = parsedURL.hostname;
	let URLPathname = parsedURL.pathname;
	let URLSearch = parsedURL.search;

	// 处理 pathname
	if (URLPathname.charAt(URLPathname.length - 1) == '/') {
		URLPathname = URLPathname.slice(0, -1);
	}
	URLPathname += url.pathname;

	// 构建新的 URL
	let newURL = `${URLProtocol}://${URLHostname}${URLPathname}${URLSearch}`;

	// 反向代理请求
	let response = await fetch(newURL);

	// 创建新的响应
	let newResponse = new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers
	});

	// 添加自定义头部，包含 URL 信息
	//newResponse.headers.set('X-Proxied-By', 'Cloudflare Worker');
	//newResponse.headers.set('X-Original-URL', fullURL);
	newResponse.headers.set('X-New-URL', newURL);

	return newResponse;
}

async function getSUB(api, request, 追加UA, userAgentHeader) {
	if (!api || api.length === 0) {
		return [];
	} else api = [...new Set(api)]; // 去重
	let newapi = "";
	let 订阅转换URLs = "";
	let 异常订阅 = "";
	const controller = new AbortController(); // 创建一个AbortController实例，用于取消请求
	const timeout = setTimeout(() => {
		controller.abort(); // 2秒后取消所有请求
	}, 2000);

	try {
		// 使用Promise.allSettled等待所有API请求完成，无论成功或失败
		const responses = await Promise.allSettled(api.map(apiUrl => getUrl(request, apiUrl, 追加UA, userAgentHeader).then(response => response.ok ? response.text() : Promise.reject(response))));

		// 遍历所有响应
		const modifiedResponses = responses.map((response, index) => {
			// 检查是否请求成功
			if (response.status === 'rejected') {
				const reason = response.reason;
				if (reason && reason.name === 'AbortError') {
					return {
						status: '超时',
						value: null,
						apiUrl: api[index] // 将原始的apiUrl添加到返回对象中
					};
				}
				console.error(`请求失败: ${api[index]}, 错误信息: ${reason.status} ${reason.statusText}`);
				return {
					status: '请求失败',
					value: null,
					apiUrl: api[index] // 将原始的apiUrl添加到返回对象中
				};
			}
			return {
				status: response.status,
				value: response.value,
				apiUrl: api[index] // 将原始的apiUrl添加到返回对象中
			};
		});

		console.log(modifiedResponses); // 输出修改后的响应数组

		for (const response of modifiedResponses) {
			// 检查响应状态是否为'fulfilled'
			if (response.status === 'fulfilled') {
				const content = await response.value || 'null'; // 获取响应的内容
				if (content.includes('proxies:')) {
					//console.log('Clash订阅: ' + response.apiUrl);
					订阅转换URLs += "|" + response.apiUrl; // Clash 配置
				} else if (content.includes('outbounds"') && content.includes('inbounds"')) {
					//console.log('Singbox订阅: ' + response.apiUrl);
					订阅转换URLs += "|" + response.apiUrl; // Singbox 配置
				} else if (content.includes('://')) {
					//console.log('明文订阅: ' + response.apiUrl);
					newapi += content + '\n'; // 追加内容
				} else if (isValidBase64(content)) {
					//console.log('Base64订阅: ' + response.apiUrl);
					newapi += base64Decode(content) + '\n'; // 解码并追加内容
				} else {
					const 异常订阅LINK = `trojan://CMLiussss@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp&headerType=none#%E5%BC%82%E5%B8%B8%E8%AE%A2%E9%98%85%20${response.apiUrl.split('://')[1].split('/')[0]}`;
					console.log('异常订阅: ' + 异常订阅LINK);
					异常订阅 += `${异常订阅LINK}\n`;
				}
			}
		}
	} catch (error) {
		console.error(error); // 捕获并输出错误信息
	} finally {
		clearTimeout(timeout); // 清除定时器
	}

	const 订阅内容 = await ADD(newapi + 异常订阅); // 将处理后的内容转换为数组
	// 返回处理后的结果
	return [订阅内容, 订阅转换URLs];
}

async function getUrl(request, targetUrl, 追加UA, userAgentHeader) {
	// 设置自定义 User-Agent
	const newHeaders = new Headers(request.headers);
	newHeaders.set("User-Agent", `${atob('djJyYXlOLzYuNDU=')} cmliu/CF-Workers-SUB ${追加UA}(${userAgentHeader})`);

	// 构建新的请求对象
	const modifiedRequest = new Request(targetUrl, {
		method: request.method,
		headers: newHeaders,
		body: request.method === "GET" ? null : request.body,
		redirect: "follow",
		cf: {
			// 忽略SSL证书验证
			insecureSkipVerify: true,
			// 允许自签名证书
			allowUntrusted: true,
			// 禁用证书验证
			validateCertificate: false
		}
	});

	// 输出请求的详细信息
	console.log(`请求URL: ${targetUrl}`);
	console.log(`请求头: ${JSON.stringify([...newHeaders])}`);
	console.log(`请求方法: ${request.method}`);
	console.log(`请求体: ${request.method === "GET" ? null : request.body}`);

	// 发送请求并返回响应
	return fetch(modifiedRequest);
}

function isValidBase64(str) {
	// 先移除所有空白字符(空格、换行、回车等)
	const cleanStr = str.replace(/\s/g, '');
	const base64Regex = /^[A-Za-z0-9+/=]+$/;
	return base64Regex.test(cleanStr);
}

async function 迁移地址列表(env, txt = 'ADD.txt') {
	const 旧数据 = await env.KV.get(`/${txt}`);
	const 新数据 = await env.KV.get(txt);

	if (旧数据 && !新数据) {
		// 写入新位置
		await env.KV.put(txt, 旧数据);
		// 删除旧数据
		await env.KV.delete(`/${txt}`);
		return true;
	}
	return false;
}

async function KV(request, env, txt = 'ADD.txt', guest) {
	const url = new URL(request.url);
	try {
		// POST请求处理
		if (request.method === "POST") {
			if (!env.KV) return new Response("未绑定KV空间", { status: 400 });
			try {
				const content = await request.text();
				await env.KV.put(txt, content);
				return new Response("保存成功");
			} catch (error) {
				console.error('保存KV时发生错误:', error);
				return new Response("保存失败: " + error.message, { status: 500 });
			}
		}

		// GET请求部分
		let content = '';
		let hasKV = !!env.KV;

		if (hasKV) {
			try {
				content = await env.KV.get(txt) || '';
			} catch (error) {
				console.error('读取KV时发生错误:', error);
				content = '读取数据时发生错误: ' + error.message;
			}
		}

		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>${FileName} 订阅编辑</title>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<style>
						body {
							margin: 0;
							padding: 15px; /* 调整padding */
							box-sizing: border-box;
							font-size: 13px; /* 设置全局字体大小 */
						}
						.editor-container {
							width: 100%;
							max-width: 100%;
							margin: 0 auto;
						}
						.editor {
							width: 100%;
							height: 300px; /* 调整高度 */
							margin: 15px 0; /* 调整margin */
							padding: 10px; /* 调整padding */
							box-sizing: border-box;
							border: 1px solid #ccc;
							border-radius: 4px;
							font-size: 13px;
							line-height: 1.5;
							overflow-y: auto;
							resize: none;
						}
						.save-container {
							margin-top: 8px; /* 调整margin */
							display: flex;
							align-items: center;
							gap: 10px; /* 调整gap */
						}
						.save-btn, .back-btn {
							padding: 6px 15px; /* 调整padding */
							color: white;
							border: none;
							border-radius: 4px;
							cursor: pointer;
						}
						.save-btn {
							background: #4CAF50;
						}
						.save-btn:hover {
							background: #45a049;
						}
						.back-btn {
							background: #666;
						}
						.back-btn:hover {
							background: #555;
						}
						.save-status {
							color: #666;
						}
					</style>
					<script src="https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js"></script>
				</head>
				<body>
					################################################################<br>
					Subscribe / sub 订阅地址, 点击链接自动 <strong>复制订阅链接</strong> 并 <strong>生成订阅二维码</strong> <br>
					---------------------------------------------------------------<br>
					自适应订阅地址:<br>
					<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?sub','qrcode_0')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/${mytoken}</a><br>
					<div id="qrcode_0" style="margin: 10px 10px 10px 10px;"></div>
					Base64订阅地址:<br>
					<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?b64','qrcode_1')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/${mytoken}?b64</a><br>
					<div id="qrcode_1" style="margin: 10px 10px 10px 10px;"></div>
					clash订阅地址:<br>
					<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?clash','qrcode_2')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/${mytoken}?clash</a><br>
					<div id="qrcode_2" style="margin: 10px 10px 10px 10px;"></div>
					singbox订阅地址:<br>
					<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?sb','qrcode_3')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/${mytoken}?sb</a><br>
					<div id="qrcode_3" style="margin: 10px 10px 10px 10px;"></div>
					surge订阅地址:<br>
					<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?surge','qrcode_4')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/${mytoken}?surge</a><br>
					<div id="qrcode_4" style="margin: 10px 10px 10px 10px;"></div>
					loon订阅地址:<br>
					<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?loon','qrcode_5')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/${mytoken}?loon</a><br>
					<div id="qrcode_5" style="margin: 10px 10px 10px 10px;"></div>
					&nbsp;&nbsp;<strong><a href="javascript:void(0);" id="noticeToggle" onclick="toggleNotice()">查看访客订阅∨</a></strong><br>
					<div id="noticeContent" class="notice-content" style="display: none;">
						---------------------------------------------------------------<br>
						访客订阅只能使用订阅功能，无法查看配置页！<br>
						GUEST（访客订阅TOKEN）: <strong>${guest}</strong><br>
						---------------------------------------------------------------<br>
						自适应订阅地址:<br>
						<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}','guest_0')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/sub?token=${guest}</a><br>
						<div id="guest_0" style="margin: 10px 10px 10px 10px;"></div>
						Base64订阅地址:<br>
						<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&b64','guest_1')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/sub?token=${guest}&b64</a><br>
						<div id="guest_1" style="margin: 10px 10px 10px 10px;"></div>
						clash订阅地址:<br>
						<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&clash','guest_2')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/sub?token=${guest}&clash</a><br>
						<div id="guest_2" style="margin: 10px 10px 10px 10px;"></div>
						singbox订阅地址:<br>
						<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&sb','guest_3')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/sub?token=${guest}&sb</a><br>
						<div id="guest_3" style="margin: 10px 10px 10px 10px;"></div>
						surge订阅地址:<br>
						<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&surge','guest_4')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/sub?token=${guest}&surge</a><br>
						<div id="guest_4" style="margin: 10px 10px 10px 10px;"></div>
						loon订阅地址:<br>
						<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&loon','guest_5')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/sub?token=${guest}&loon</a><br>
						<div id="guest_5" style="margin: 10px 10px 10px 10px;"></div>
					</div>
					---------------------------------------------------------------<br>
					################################################################<br>
					订阅转换配置<br>
					---------------------------------------------------------------<br>
					SUBAPI（订阅转换后端）: <strong>${subProtocol}://${subConverter}</strong><br>
					SUBCONFIG（订阅转换配置文件）: <strong>${subConfig}</strong><br>
					---------------------------------------------------------------<br>
					################################################################<br>
					${FileName} 汇聚订阅编辑: 
					<div class="editor-container">
						${hasKV ? `
						<textarea class="editor" 
							placeholder="${decodeURIComponent(atob('TElOSyVFNyVBNCVCQSVFNCVCRSU4QiVFRiVCQyU4OCVFNCVCOCU4MCVFOCVBMSU4QyVFNCVCOCU4MCVFNCVCOCVBQSVFOCU4QSU4MiVFNyU4MiVCOSVFOSU5MyVCRSVFNiU4RSVBNSVFNSU4RCVCMyVFNSU4RiVBRiVFRiVCQyU4OSVFRiVCQyU5QQp2bGVzcyUzQSUyRiUyRjI0NmFhNzk1LTA2MzctNGY0Yy04ZjY0LTJjOGZiMjRjMWJhZCU0MDEyNy4wLjAuMSUzQTEyMzQlM0ZlbmNyeXB0aW9uJTNEbm9uZSUyNnNlY3VyaXR5JTNEdGxzJTI2c25pJTNEVEcuQ01MaXVzc3NzLmxvc2V5b3VyaXAuY29tJTI2YWxsb3dJbnNlY3VyZSUzRDElMjZ0eXBlJTNEd3MlMjZob3N0JTNEVEcuQ01MaXVzc3NzLmxvc2V5b3VyaXAuY29tJTI2cGF0aCUzRCUyNTJGJTI1M0ZlZCUyNTNEMjU2MCUyM0NGbmF0CnRyb2phbiUzQSUyRiUyRmFhNmRkZDJmLWQxY2YtNGE1Mi1iYTFiLTI2NDBjNDFhNzg1NiU0MDIxOC4xOTAuMjMwLjIwNyUzQTQxMjg4JTNGc2VjdXJpdHklM0R0bHMlMjZzbmklM0RoazEyLmJpbGliaWxpLmNvbSUyNmFsbG93SW5zZWN1cmUlM0QxJTI2dHlwZSUzRHRjcCUyNmhlYWRlclR5cGUlM0Rub25lJTIzSEsKc3MlM0ElMkYlMkZZMmhoWTJoaE1qQXRhV1YwWmkxd2IyeDVNVE13TlRveVJYUlFjVzQyU0ZscVZVNWpTRzlvVEdaVmNFWlJkMjVtYWtORFVUVnRhREZ0U21SRlRVTkNkV04xVjFvNVVERjFaR3RTUzBodVZuaDFielUxYXpGTFdIb3lSbTgyYW5KbmRERTRWelkyYjNCMGVURmxOR0p0TVdwNlprTm1RbUklMjUzRCU0MDg0LjE5LjMxLjYzJTNBNTA4NDElMjNERQoKCiVFOCVBRSVBMiVFOSU5OCU4NSVFOSU5MyVCRSVFNiU4RSVBNSVFNyVBNCVCQSVFNCVCRSU4QiVFRiVCQyU4OCVFNCVCOCU4MCVFOCVBMSU4QyVFNCVCOCU4MCVFNiU5RCVBMSVFOCVBRSVBMiVFOSU5OCU4NSVFOSU5MyVCRSVFNiU4RSVBNSVFNSU4RCVCMyVFNSU4RiVBRiVFRiVCQyU4OSVFRiVCQyU5QQpodHRwcyUzQSUyRiUyRnN1Yi54Zi5mcmVlLmhyJTJGYXV0bw=='))}"
							id="content">${content}</textarea>
						<div class="save-container">
							<button class="save-btn" onclick="saveContent(this)">保存</button>
							<span class="save-status" id="saveStatus"></span>
						</div>
						` : '<p>请绑定 <strong>变量名称</strong> 为 <strong>KV</strong> 的KV命名空间</p>'}
					</div>
					<br>
					################################################################<br>
					${decodeURIComponent(atob('dGVsZWdyYW0lMjAlRTQlQkElQTQlRTYlQjUlODElRTclQkUlQTQlMjAlRTYlOEElODAlRTYlOUMlQUYlRTUlQTQlQTclRTQlQkQlQUMlN0UlRTUlOUMlQTglRTclQkElQkYlRTUlOEYlOTElRTclODklOEMhJTNDYnIlM0UKJTNDYSUyMGhyZWYlM0QlMjdodHRwcyUzQSUyRiUyRnQubWUlMkZDTUxpdXNzc3MlMjclM0VodHRwcyUzQSUyRiUyRnQubWUlMkZDTUxpdXNzc3MlM0MlMkZhJTNFJTNDYnIlM0UKLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tJTNDYnIlM0UKZ2l0aHViJTIwJUU5JUExJUI5JUU3JTlCJUFFJUU1JTlDJUIwJUU1JTlEJTgwJTIwU3RhciFTdGFyIVN0YXIhISElM0NiciUzRQolM0NhJTIwaHJlZiUzRCUyN2h0dHBzJTNBJTJGJTJGZ2l0aHViLmNvbSUyRmNtbGl1JTJGQ0YtV29ya2Vycy1TVUIlMjclM0VodHRwcyUzQSUyRiUyRmdpdGh1Yi5jb20lMkZjbWxpdSUyRkNGLVdvcmtlcnMtU1VCJTNDJTJGYSUzRSUzQ2JyJTNFCi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSUzQ2JyJTNFCiUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMw=='))}
					<br><br>UA: <strong>${request.headers.get('User-Agent')}</strong>
					<script>
					function copyToClipboard(text, qrcode) {
						navigator.clipboard.writeText(text).then(() => {
							alert('已复制到剪贴板');
						}).catch(err => {
							console.error('复制失败:', err);
						});
						const qrcodeDiv = document.getElementById(qrcode);
						qrcodeDiv.innerHTML = '';
						new QRCode(qrcodeDiv, {
							text: text,
							width: 220, // 调整宽度
							height: 220, // 调整高度
							colorDark: "#000000", // 二维码颜色
							colorLight: "#ffffff", // 背景颜色
							correctLevel: QRCode.CorrectLevel.Q, // 设置纠错级别
							scale: 1 // 调整像素颗粒度
						});
					}
						
					if (document.querySelector('.editor')) {
						let timer;
						const textarea = document.getElementById('content');
						const originalContent = textarea.value;
		
						function goBack() {
							const currentUrl = window.location.href;
							const parentUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/'));
							window.location.href = parentUrl;
						}
		
						function replaceFullwidthColon() {
							const text = textarea.value;
							textarea.value = text.replace(/：/g, ':');
						}
						
						function saveContent(button) {
							try {
								const updateButtonText = (step) => {
									button.textContent = \`保存中: \${step}\`;
								};
								// 检测是否为iOS设备
								const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
								
								// 仅在非iOS设备上执行replaceFullwidthColon
								if (!isIOS) {
									replaceFullwidthColon();
								}
								updateButtonText('开始保存');
								button.disabled = true;

								// 获取textarea内容和原始内容
								const textarea = document.getElementById('content');
								if (!textarea) {
									throw new Error('找不到文本编辑区域');
								}

								updateButtonText('获取内容');
								let newContent;
								let originalContent;
								try {
									newContent = textarea.value || '';
									originalContent = textarea.defaultValue || '';
								} catch (e) {
									console.error('获取内容错误:', e);
									throw new Error('无法获取编辑内容');
								}

								updateButtonText('准备状态更新函数');
								const updateStatus = (message, isError = false) => {
									const statusElem = document.getElementById('saveStatus');
									if (statusElem) {
										statusElem.textContent = message;
										statusElem.style.color = isError ? 'red' : '#666';
									}
								};

								updateButtonText('准备按钮重置函数');
								const resetButton = () => {
									button.textContent = '保存';
									button.disabled = false;
								};

								if (newContent !== originalContent) {
									updateButtonText('发送保存请求');
									fetch(window.location.href, {
										method: 'POST',
										body: newContent,
										headers: {
											'Content-Type': 'text/plain;charset=UTF-8'
										},
										cache: 'no-cache'
									})
									.then(response => {
										updateButtonText('检查响应状态');
										if (!response.ok) {
											throw new Error(\`HTTP error! status: \${response.status}\`);
										}
										updateButtonText('更新保存状态');
										const now = new Date().toLocaleString();
										document.title = \`编辑已保存 \${now}\`;
										updateStatus(\`已保存 \${now}\`);
									})
									.catch(error => {
										updateButtonText('处理错误');
										console.error('Save error:', error);
										updateStatus(\`保存失败: \${error.message}\`, true);
									})
									.finally(() => {
										resetButton();
									});
								} else {
									updateButtonText('检查内容变化');
									updateStatus('内容未变化');
									resetButton();
								}
							} catch (error) {
								console.error('保存过程出错:', error);
								button.textContent = '保存';
								button.disabled = false;
								const statusElem = document.getElementById('saveStatus');
								if (statusElem) {
									statusElem.textContent = \`错误: \${error.message}\`;
									statusElem.style.color = 'red';
								}
							}
						}
		
						textarea.addEventListener('blur', saveContent);
						textarea.addEventListener('input', () => {
							clearTimeout(timer);
							timer = setTimeout(saveContent, 5000);
						});
					}

					function toggleNotice() {
						const noticeContent = document.getElementById('noticeContent');
						const noticeToggle = document.getElementById('noticeToggle');
						if (noticeContent.style.display === 'none' || noticeContent.style.display === '') {
							noticeContent.style.display = 'block';
							noticeToggle.textContent = '隐藏访客订阅∧';
						} else {
							noticeContent.style.display = 'none';
							noticeToggle.textContent = '查看访客订阅∨';
						}
					}
			
					// 初始化 noticeContent 的 display 属性
					document.addEventListener('DOMContentLoaded', () => {
						document.getElementById('noticeContent').style.display = 'none';
					});
					</script>
				</body>
			</html>
		`;

		return new Response(html, {
			headers: { "Content-Type": "text/html;charset=utf-8" }
		});
	} catch (error) {
		console.error('处理请求时发生错误:', error);
		return new Response("服务器错误: " + error.message, {
			status: 500,
			headers: { "Content-Type": "text/plain;charset=utf-8" }
		});
	}
}

// 获取所有有效的访客token
async function getValidGuestTokens(env) {
	if (!env.KV) return [];
	try {
		const tokensData = await env.KV.get('GUEST_TOKENS');
		if (!tokensData) return [];
		const tokens = JSON.parse(tokensData);
		return tokens.filter(tokenInfo => tokenInfo.active).map(tokenInfo => tokenInfo.token);
	} catch (error) {
		console.error('获取访客token失败:', error);
		return [];
	}
}

// 记录token访问日志
async function logTokenAccess(env, token, ip, userAgent) {
	if (!env.KV) return;
	try {
		const logKey = `ACCESS_LOG_${token}`;
		const existingLog = await env.KV.get(logKey);
		let logs = existingLog ? JSON.parse(existingLog) : [];
		
		logs.push({
			timestamp: new Date().toISOString(),
			ip: ip,
			userAgent: userAgent
		});
		
		// 只保留最近100条记录
		if (logs.length > 100) {
			logs = logs.slice(-100);
		}
		
		await env.KV.put(logKey, JSON.stringify(logs));
	} catch (error) {
		console.error('记录访问日志失败:', error);
	}
}

// 管理员面板
async function AdminPanel(request, env) {
	const url = new URL(request.url);
	
	try {
		// POST请求处理
		if (request.method === "POST") {
			if (!env.KV) return new Response(JSON.stringify({success: false, message: "未绑定KV空间"}), { 
				status: 400,
				headers: { "Content-Type": "application/json;charset=utf-8" }
			});
			
			const formData = await request.formData();
			const action = formData.get('action');
			
			if (action === 'view_nodes') {
				// 查看节点功能
				try {
					const subscriptionUrl = formData.get('subscriptionUrl');
					if (!subscriptionUrl) {
						return new Response(JSON.stringify({
							success: false,
							message: "请提供订阅链接"
						}), {
							headers: { "Content-Type": "application/json;charset=utf-8" }
						});
					}
					
					// 获取订阅内容
					const response = await fetch(subscriptionUrl);
					let content = await response.text();
					
					// 处理Base64编码的订阅
					if (!content.includes('://') && isValidBase64(content)) {
						content = base64Decode(content);
					}
					
					// 解析节点
					const nodes = await ADD(content);
					const nodeList = nodes.filter(node => node.includes('://')).map((node, index) => {
						// 解析节点信息
						const protocol = node.split('://')[0];
						let nodeName = '';
						
						// 提取节点名称
						if (node.includes('#')) {
							nodeName = decodeURIComponent(node.split('#')[1]);
						} else {
							nodeName = `节点${index + 1}`;
						}
						
						return {
							index: index,
							protocol: protocol,
							name: nodeName,
							url: node,
							preview: node.length > 100 ? node.substring(0, 100) + '...' : node
						};
					});
					
					return new Response(JSON.stringify({
						success: true,
						nodes: nodeList,
						total: nodeList.length
					}), {
						headers: { "Content-Type": "application/json;charset=utf-8" }
					});
				} catch (error) {
					return new Response(JSON.stringify({
						success: false,
						message: "获取节点信息失败: " + error.message
					}), {
						headers: { "Content-Type": "application/json;charset=utf-8" }
					});
				}
			}
			
			if (action === 'filter_nodes') {
				// 过滤节点功能
				try {
					const subscriptionUrl = formData.get('subscriptionUrl');
					const excludeIndices = formData.get('excludeIndices');
					
					if (!subscriptionUrl) {
						return new Response(JSON.stringify({
							success: false,
							message: "请提供订阅链接"
						}), {
							headers: { "Content-Type": "application/json;charset=utf-8" }
						});
					}
					
					// 获取订阅内容
					const response = await fetch(subscriptionUrl);
					let content = await response.text();
					
					// 处理Base64编码的订阅
					if (!content.includes('://') && isValidBase64(content)) {
						content = base64Decode(content);
					}
					
					// 解析节点
					const nodes = await ADD(content);
					const validNodes = nodes.filter(node => node.includes('://'));
					
					// 过滤掉指定的节点
					let filteredNodes = validNodes;
					if (excludeIndices) {
						const excludeList = excludeIndices.split(',').map(i => parseInt(i.trim()));
						filteredNodes = validNodes.filter((node, index) => !excludeList.includes(index));
					}
					
					// 生成过滤后的订阅内容
					const filteredContent = filteredNodes.join('\n');
					const base64Content = base64Encode(filteredContent);
					
					return new Response(JSON.stringify({
						success: true,
						filteredContent: base64Content,
						originalCount: validNodes.length,
						filteredCount: filteredNodes.length,
						removedCount: validNodes.length - filteredNodes.length
					}), {
						headers: { "Content-Type": "application/json;charset=utf-8" }
					});
				} catch (error) {
					return new Response(JSON.stringify({
						success: false,
						message: "过滤节点失败: " + error.message
					}), {
						headers: { "Content-Type": "application/json;charset=utf-8" }
					});
				}
			}
			
			if (action === 'create_token') {
				const tokenName = formData.get('tokenName');
				const tokenValue = formData.get('tokenValue') || await generateRandomToken();
				
				const tokensData = await env.KV.get('GUEST_TOKENS') || '[]';
				const tokens = JSON.parse(tokensData);
				
				// 检查token是否已存在
				if (tokens.some(t => t.token === tokenValue)) {
					return new Response(JSON.stringify({success: false, message: "Token已存在"}), {
						headers: { "Content-Type": "application/json;charset=utf-8" }
					});
				}
				
				const newToken = {
					token: tokenValue,
					name: tokenName,
					createdAt: new Date().toISOString(),
					active: true
				};
				
				tokens.push(newToken);
				await env.KV.put('GUEST_TOKENS', JSON.stringify(tokens));
				
				return new Response(JSON.stringify({
					success: true, 
					message: "Token创建成功",
					token: newToken
				}), {
					headers: { "Content-Type": "application/json;charset=utf-8" }
				});
			}
			
			if (action === 'toggle_token') {
				const tokenValue = formData.get('tokenValue');
				
				const tokensData = await env.KV.get('GUEST_TOKENS') || '[]';
				const tokens = JSON.parse(tokensData);
				
				const tokenIndex = tokens.findIndex(t => t.token === tokenValue);
				if (tokenIndex !== -1) {
					tokens[tokenIndex].active = !tokens[tokenIndex].active;
					await env.KV.put('GUEST_TOKENS', JSON.stringify(tokens));
					
					return new Response(JSON.stringify({
						success: true, 
						message: "Token状态更新成功",
						token: tokens[tokenIndex]
					}), {
						headers: { "Content-Type": "application/json;charset=utf-8" }
					});
				}
				return new Response(JSON.stringify({success: false, message: "Token不存在"}), { 
					status: 404,
					headers: { "Content-Type": "application/json;charset=utf-8" }
				});
			}
			
			if (action === 'delete_token') {
				const tokenValue = formData.get('tokenValue');
				
				if (!tokenValue) {
					return new Response(JSON.stringify({
						success: false, 
						message: "Token值不能为空"
					}), {
						headers: { "Content-Type": "application/json;charset=utf-8" }
					});
				}
				
				const tokensData = await env.KV.get('GUEST_TOKENS') || '[]';
				const tokens = JSON.parse(tokensData);
				
				// 检查token是否存在
				const tokenExists = tokens.some(t => t.token === tokenValue);
				if (!tokenExists) {
					return new Response(JSON.stringify({
						success: false, 
						message: "Token不存在"
					}), {
						headers: { "Content-Type": "application/json;charset=utf-8" }
					});
				}
				
				// 过滤掉要删除的token
				const filteredTokens = tokens.filter(t => t.token !== tokenValue);
				
				// 保存更新后的数据
				await env.KV.put('GUEST_TOKENS', JSON.stringify(filteredTokens));
				
				// 删除对应的访问日志
				await env.KV.delete(`ACCESS_LOG_${tokenValue}`);
				
				return new Response(JSON.stringify({
					success: true, 
					message: "Token删除成功",
					tokenValue: tokenValue,
					remainingCount: filteredTokens.length
				}), {
					headers: { "Content-Type": "application/json;charset=utf-8" }
				});
			}
		}
		
		// GET请求 - 显示管理面板
		const tokensData = await env.KV?.get('GUEST_TOKENS') || '[]';
		const tokens = JSON.parse(tokensData);
		
		// 获取访问统计
		const accessStats = {};
		for (const tokenInfo of tokens) {
			try {
				const logData = await env.KV?.get(`ACCESS_LOG_${tokenInfo.token}`);
				if (logData) {
					const logs = JSON.parse(logData);
					accessStats[tokenInfo.token] = {
						totalAccess: logs.length,
						lastAccess: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
						recentLogs: logs.slice(-5)
					};
				} else {
					accessStats[tokenInfo.token] = {
						totalAccess: 0,
						lastAccess: null,
						recentLogs: []
					};
				}
			} catch (error) {
				console.error(`获取${tokenInfo.token}访问统计失败:`, error);
				accessStats[tokenInfo.token] = {
					totalAccess: 0,
					lastAccess: null,
					recentLogs: []
				};
			}
		}
		
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>${FileName} 管理面板</title>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<style>
						body {
							font-family: Arial, sans-serif;
							margin: 0;
							padding: 20px;
							background-color: #f5f5f5;
						}
						.container {
							max-width: 1200px;
							margin: 0 auto;
							background: white;
							padding: 20px;
							border-radius: 8px;
							box-shadow: 0 2px 10px rgba(0,0,0,0.1);
						}
						h1 {
							color: #333;
							border-bottom: 2px solid #4CAF50;
							padding-bottom: 10px;
						}
						.section {
							margin: 20px 0;
							padding: 15px;
							border: 1px solid #ddd;
							border-radius: 5px;
						}
						.form-group {
							margin: 10px 0;
						}
						.form-group label {
							display: block;
							margin-bottom: 5px;
							font-weight: bold;
						}
						.form-group input {
							width: 100%;
							padding: 8px;
							border: 1px solid #ddd;
							border-radius: 4px;
							box-sizing: border-box;
						}
						.btn {
							padding: 8px 16px;
							border: none;
							border-radius: 4px;
							cursor: pointer;
							margin: 5px;
						}
						.btn:disabled {
							opacity: 0.6;
							cursor: not-allowed;
						}
						.btn-primary { background: #4CAF50; color: white; }
						.btn-warning { background: #ff9800; color: white; }
						.btn-danger { background: #f44336; color: white; }
						.btn-secondary { background: #6c757d; color: white; }
						.token-item {
							border: 1px solid #ddd;
							padding: 15px;
							margin: 10px 0;
							border-radius: 5px;
							background: #f9f9f9;
						}
						.token-active { border-left: 4px solid #4CAF50; }
						.token-inactive { border-left: 4px solid #f44336; }
						.stats {
							display: grid;
							grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
							gap: 10px;
							margin: 10px 0;
						}
						.stat-item {
							padding: 10px;
							background: #e8f5e8;
							border-radius: 4px;
							text-align: center;
						}
						.log-item {
							padding: 5px;
							margin: 2px 0;
							background: #f0f0f0;
							border-radius: 3px;
							font-size: 12px;
						}
						.message {
							padding: 10px;
							margin: 10px 0;
							border-radius: 4px;
							display: none;
						}
						.message.success {
							background: #d4edda;
							color: #155724;
							border: 1px solid #c3e6cb;
						}
						.message.error {
							background: #f8d7da;
							color: #721c24;
							border: 1px solid #f5c6cb;
						}
						.loading {
							opacity: 0.6;
							pointer-events: none;
						}
					</style>
					<script>
						// 显示消息
						function showMessage(message, type = 'success') {
							const messageDiv = document.getElementById('message');
							messageDiv.textContent = message;
							messageDiv.className = 'message ' + type;
							messageDiv.style.display = 'block';
							setTimeout(() => {
								messageDiv.style.display = 'none';
							}, 3000);
						}

						// AJAX提交表单
						async function submitForm(form, callback) {
							const formData = new FormData(form);
							const button = form.querySelector('button[type="submit"]') || document.activeElement;
							const originalText = button ? button.textContent : '';
							
							if (button) {
								button.disabled = true;
								button.textContent = '处理中...';
							}
							
							try {
								console.log('提交表单数据:', Object.fromEntries(formData)); // 调试日志
								
								const response = await fetch(window.location.href, {
									method: 'POST',
									body: formData
								});
								
								console.log('响应状态:', response.status); // 调试日志
								
								if (!response.ok) {
									throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
								}
								
								const result = await response.json();
								console.log('响应结果:', result); // 调试日志
								
								if (result.success) {
									showMessage(result.message, 'success');
									if (callback) callback(result);
								} else {
									showMessage(result.message, 'error');
									if (callback) callback(result);
								}
							} catch (error) {
								console.error('提交表单错误:', error); // 调试日志
								showMessage('操作失败: ' + error.message, 'error');
								if (callback) callback({success: false, message: error.message});
							} finally {
								if (button) {
									button.disabled = false;
									button.textContent = originalText;
								}
							}
						}

						// 创建Token
						function createToken() {
							const form = document.getElementById('createTokenForm');
							submitForm(form, (result) => {
								// 清空表单
								form.reset();
								// 刷新页面显示新token
								setTimeout(() => location.reload(), 1000);
							});
							return false;
						}

						// 切换Token状态
						function toggleToken(tokenValue, button) {
							const form = document.createElement('form');
							form.innerHTML = \`
								<input type="hidden" name="action" value="toggle_token">
								<input type="hidden" name="tokenValue" value="\${tokenValue}">
							\`;
							
							submitForm(form, (result) => {
								// 更新按钮状态
								const tokenItem = button.closest('.token-item');
								const statusIcon = tokenItem.querySelector('h3');
								
								if (result.token.active) {
									button.textContent = '禁用';
									button.className = 'btn btn-warning';
									tokenItem.className = 'token-item token-active';
									statusIcon.innerHTML = statusIcon.innerHTML.replace('🔴', '🟢');
								} else {
									button.textContent = '启用';
									button.className = 'btn btn-primary';
									tokenItem.className = 'token-item token-inactive';
									statusIcon.innerHTML = statusIcon.innerHTML.replace('🟢', '🔴');
								}
							});
						}

						// 删除Token
						function deleteToken(tokenValue, button) {
							if (!confirm('确定要删除这个Token吗？')) {
								return;
							}
							
							console.log('删除Token:', tokenValue); // 调试日志
							
							const form = document.createElement('form');
							form.innerHTML = \`
								<input type="hidden" name="action" value="delete_token">
								<input type="hidden" name="tokenValue" value="\${tokenValue}">
							\`;
							
							submitForm(form, (result) => {
								console.log('删除结果:', result); // 调试日志
								if (result.success) {
									// 移除token项
									const tokenItem = button.closest('.token-item');
									if (tokenItem) {
										tokenItem.style.transition = 'opacity 0.3s';
										tokenItem.style.opacity = '0';
										setTimeout(() => {
											tokenItem.remove();
											// 更新统计数据
											updateStats();
										}, 300);
									}
								} else {
									showMessage(result.message || '删除失败', 'error');
								}
							});
						}

						// 更新统计数据
						function updateStats() {
							const tokenItems = document.querySelectorAll('.token-item');
							const activeTokens = document.querySelectorAll('.token-active').length;
							
							document.querySelector('.stats .stat-item:nth-child(1) strong').textContent = tokenItems.length;
							document.querySelector('.stats .stat-item:nth-child(2) strong').textContent = activeTokens;
						}

						// 查看节点
						function viewNodes() {
							const subscriptionUrl = document.getElementById('subscriptionUrl').value.trim();
							if (!subscriptionUrl) {
								showMessage('请输入订阅链接', 'error');
								return;
							}

							const form = document.createElement('form');
							form.innerHTML = \`
								<input type="hidden" name="action" value="view_nodes">
								<input type="hidden" name="subscriptionUrl" value="\${subscriptionUrl}">
							\`;

							submitForm(form, (result) => {
								if (result.success) {
									displayNodes(result.nodes);
									document.getElementById('nodesList').style.display = 'block';
									showMessage(\`成功获取 \${result.total} 个节点\`, 'success');
								} else {
									showMessage(result.message || '获取节点失败', 'error');
								}
							});
						}

						// 显示节点列表
						function displayNodes(nodes) {
							const container = document.getElementById('nodesContainer');
							container.innerHTML = '';

							if (nodes.length === 0) {
								container.innerHTML = '<p>未找到有效节点</p>';
								return;
							}

							nodes.forEach(node => {
								const nodeDiv = document.createElement('div');
								nodeDiv.className = 'node-item';
								nodeDiv.style.cssText = 'border: 1px solid #ddd; margin: 5px 0; padding: 10px; border-radius: 5px; background: #f9f9f9;';
								
								nodeDiv.innerHTML = \`
									<div style="display: flex; align-items: center; margin-bottom: 5px;">
										<input type="checkbox" id="node_\${node.index}" checked style="margin-right: 10px;">
										<label for="node_\${node.index}" style="font-weight: bold; color: #333;">
											[\${node.protocol.toUpperCase()}] \${node.name}
										</label>
									</div>
									<div style="font-size: 12px; color: #666; font-family: monospace; word-break: break-all;">
										\${node.preview}
									</div>
								\`;
								
								container.appendChild(nodeDiv);
							});
						}

						// 全选节点
						function selectAll() {
							const checkboxes = document.querySelectorAll('#nodesContainer input[type="checkbox"]');
							checkboxes.forEach(cb => cb.checked = true);
						}

						// 全不选节点
						function selectNone() {
							const checkboxes = document.querySelectorAll('#nodesContainer input[type="checkbox"]');
							checkboxes.forEach(cb => cb.checked = false);
						}

						// 过滤节点
						function filterNodes() {
							const subscriptionUrl = document.getElementById('subscriptionUrl').value.trim();
							if (!subscriptionUrl) {
								showMessage('请先查看节点', 'error');
								return;
							}

							// 获取未选中的节点索引
							const checkboxes = document.querySelectorAll('#nodesContainer input[type="checkbox"]');
							const excludeIndices = [];
							checkboxes.forEach((cb, index) => {
								if (!cb.checked) {
									const nodeIndex = cb.id.replace('node_', '');
									excludeIndices.push(nodeIndex);
								}
							});

							const form = document.createElement('form');
							form.innerHTML = \`
								<input type="hidden" name="action" value="filter_nodes">
								<input type="hidden" name="subscriptionUrl" value="\${subscriptionUrl}">
								<input type="hidden" name="excludeIndices" value="\${excludeIndices.join(',')}">
							\`;

							submitForm(form, (result) => {
								if (result.success) {
									document.getElementById('filteredContent').value = result.filteredContent;
									document.getElementById('filterStats').textContent = 
										\`原始节点: \${result.originalCount} 个，过滤后: \${result.filteredCount} 个，移除: \${result.removedCount} 个\`;
									document.getElementById('filteredResult').style.display = 'block';
									showMessage('过滤完成', 'success');
								} else {
									showMessage(result.message || '过滤失败', 'error');
								}
							});
						}
					</script>
				</head>
				<body>
					<div class="container">
						<h1>🛠️ ${FileName} 管理面板</h1>
						
						<div id="message" class="message"></div>
						
						<div class="section">
							<h2>🔍 节点管理</h2>
							<div class="form-group">
								<label>订阅链接:</label>
								<input type="text" id="subscriptionUrl" placeholder="输入订阅链接查看节点信息" style="width: 70%; display: inline-block;">
								<button onclick="viewNodes()" class="btn btn-primary" style="width: 25%; margin-left: 5%;">查看节点</button>
							</div>
							<div id="nodesList" style="display: none;">
								<h3>节点列表</h3>
								<div id="nodesContainer"></div>
								<div style="margin-top: 15px;">
									<button onclick="filterNodes()" class="btn btn-success">生成过滤后的订阅</button>
									<button onclick="selectAll()" class="btn btn-secondary">全选</button>
									<button onclick="selectNone()" class="btn btn-secondary">全不选</button>
								</div>
								<div id="filteredResult" style="display: none; margin-top: 15px;">
									<h4>过滤结果</h4>
									<textarea id="filteredContent" readonly style="width: 100%; height: 100px; font-family: monospace; font-size: 12px;"></textarea>
									<p id="filterStats"></p>
								</div>
							</div>
						</div>
						
						<div class="section">
							<h2>📊 系统概览</h2>
							<div class="stats">
								<div class="stat-item">
									<strong>${tokens.length}</strong><br>总Token数
								</div>
								<div class="stat-item">
									<strong>${tokens.filter(t => t.active).length}</strong><br>活跃Token
								</div>
								<div class="stat-item">
									<strong>${Object.values(accessStats).reduce((sum, stat) => sum + stat.totalAccess, 0)}</strong><br>总访问次数
								</div>
							</div>
						</div>
						
						<div class="section">
							<h2>➕ 创建新Token</h2>
							<form id="createTokenForm" onsubmit="createToken(); return false;">
								<input type="hidden" name="action" value="create_token">
								<div class="form-group">
									<label>Token名称:</label>
									<input type="text" name="tokenName" required placeholder="例如: 朋友A的订阅">
								</div>
								<div class="form-group">
									<label>Token值 (留空自动生成):</label>
									<input type="text" name="tokenValue" placeholder="留空将自动生成随机token">
								</div>
								<button type="submit" class="btn btn-primary">创建Token</button>
							</form>
						</div>
						
						<div class="section">
							<h2>📋 Token管理</h2>
							${tokens.length === 0 ? '<p>暂无Token</p>' : tokens.map(tokenInfo => {
								const stats = accessStats[tokenInfo.token] || { totalAccess: 0, lastAccess: null, recentLogs: [] };
								return `
									<div class="token-item ${tokenInfo.active ? 'token-active' : 'token-inactive'}">
										<h3>${tokenInfo.name} ${tokenInfo.active ? '🟢' : '🔴'}</h3>
										<p><strong>Token:</strong> <code>${tokenInfo.token}</code></p>
										<p><strong>创建时间:</strong> ${new Date(tokenInfo.createdAt).toLocaleString()}</p>
										<p><strong>访问次数:</strong> ${stats.totalAccess}</p>
										<p><strong>最后访问:</strong> ${stats.lastAccess ? new Date(stats.lastAccess).toLocaleString() : '从未访问'}</p>
										
										<h4>订阅链接:</h4>
										<p><a href="https://${url.hostname}/sub?token=${tokenInfo.token}" target="_blank">https://${url.hostname}/sub?token=${tokenInfo.token}</a></p>
										
										${stats.recentLogs.length > 0 ? `
											<h4>最近访问记录:</h4>
											${stats.recentLogs.map(log => `
												<div class="log-item">
													${new Date(log.timestamp).toLocaleString()} - IP: ${log.ip}
												</div>
											`).join('')}
										` : ''}
										
										<div style="margin-top: 10px;">
											<button type="button" class="btn ${tokenInfo.active ? 'btn-warning' : 'btn-primary'}" 
													onclick="toggleToken('${tokenInfo.token}', this)">
												${tokenInfo.active ? '禁用' : '启用'}
											</button>
											<button type="button" class="btn btn-danger" 
													onclick="deleteToken('${tokenInfo.token}', this)">
												删除
											</button>
										</div>
									</div>
								`;
							}).join('')}
						</div>
						
						<div class="section">
							<h2>ℹ️ 使用说明</h2>
							<ul>
								<li>管理员Token: <code>${adminToken}</code></li>
								<li>管理面板访问地址: <code>https://${url.hostname}/${adminToken}</code></li>
								<li>创建的访客Token可以用于订阅访问，但无法访问管理面板</li>
								<li>禁用的Token将无法访问订阅服务</li>
								<li>删除Token会同时删除其访问日志</li>
							</ul>
						</div>
					</div>
				</body>
			</html>
		`;
		
		return new Response(html, {
			headers: { "Content-Type": "text/html;charset=utf-8" }
		});
	} catch (error) {
		console.error('管理面板错误:', error);
		return new Response("管理面板错误: " + error.message, {
			status: 500,
			headers: { "Content-Type": "text/plain;charset=utf-8" }
		});
	}
}

// 生成随机token
async function generateRandomToken() {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < 16; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}