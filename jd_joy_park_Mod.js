/*
汪汪乐园
活动地址: 极速版 汪汪乐园  更新地址：https://github.com/Tsukasa007/my_script
活动时间：长期
更新时间：2021-07-4 12:00
脚本兼容: QuantumultX, Surge,Loon, JSBox, Node.js
ENV
JOYPARK_JOY_START =      只做前几个CK
JOY_COIN_MAXIMIZE =      最大化硬币收益，如果合成后全部挖土后还有空位，则开启此模式（默认关闭） 0关闭 1开启
请确保新用户助力过开工位，否则开启游戏了就不算新用户，后面就不能助力开工位了！！！！！！！！！！
=================================Quantumultx=========================
[task_local]
#汪汪乐园
20 * * * *  https://raw.githubusercontent.com/jiulan/platypus/main/scripts/jd_joy_park.js, tag=汪汪乐园, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/jd.png, enabled=true
=================================Loon===================================
[Script]
cron "20 * * * *" script-path=https://raw.githubusercontent.com/jiulan/platypus/main/scripts/jd_joy_park.js,tag=汪汪乐园
===================================Surge================================
汪汪乐园 = type=cron,cronexp="20 * * * *",wake-system=1,timeout=3600,script-path=https://raw.githubusercontent.com/jiulan/platypus/main/scripts/jd_joy_park.js
====================================小火箭=============================
汪汪乐园 = type=cron,script-path=https://raw.githubusercontent.com/jiulan/platypus/main/scripts/jd_joy_park.js, cronexpr="20 * * * *", timeout=3600, enable=true
 */
const $ = new Env('汪汪乐园养joy');
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
let hot_flag = false      //帮助作者助力
const notify = $.isNode() ? require('./sendNotify') : '';
//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [],
    cookie = '';
if ($.isNode()) {
    Object.keys(jdCookieNode).forEach((item) => {
        cookiesArr.push(jdCookieNode[item])
    })
    if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => { };
} else {
    cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
}

//最大化硬币收益模式
$.JOY_COIN_MAXIMIZE = process.env.JOY_COIN_MAXIMIZE === '1'
$.log(`最大化收益模式: 已${$.JOY_COIN_MAXIMIZE ? `默认开启` : `关闭`}  `)

const JD_API_HOST = `https://api.m.jd.com/client.action`;
message = ""
!(async () => {
    $.user_agent = require('./USER_AGENTS').USER_AGENT
    if (!cookiesArr[0]) {
        $.msg($.name, '【提示】请先获取cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/', {
            "open-url": "https://bean.m.jd.com/"
        });
        return;
    }
    if (process.env.JD_JOY_PARK && process.env.JD_JOY_PARK === 'false') {
        console.log(`\n******检测到您设置了不运行汪汪乐园，停止运行此脚本******\n`)
        return;
    }
    for (let i = 0; i < cookiesArr.length; i++) {
        //$.wait(50)
        // if (process.env.JOYPARK_JOY_START && i == process.env.JOYPARK_JOY_START){
        //   console.log(`\n汪汪乐园养joy 只运行 ${process.env.JOYPARK_JOY_START} 个Cookie\n`);
        //   break
        // }
        hot_flag = false
        cookie = cookiesArr[i];
        if (cookie) {
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
            $.index = i + 1;
            $.isLogin = true;
            $.nickName = '';
            $.maxJoyCount = 10
            await TotalBean();
            if (!$.isLogin) {
                $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, { "open-url": "https://bean.m.jd.com/bean/signIndex.action" });

                if ($.isNode()) {
                    await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
                }
                continue
            }
            console.log(`\n\n******开始【京东账号${$.index}】${$.nickName || $.UserName}*********\n`);
            if ($.isNode()) {
                if (process.env.HELP_JOYPARK && process.env.HELP_JOYPARK == "false") {
                } else {
                    await getShareCode()
                    if ($.kgw_invitePin && $.kgw_invitePin.length) {
                        $.log("开始帮【zero205】助力开工位\n");
                        $.kgw_invitePin = [...($.kgw_invitePin || [])][Math.floor((Math.random() * $.kgw_invitePin.length))];
                        let resp = await getJoyBaseInfo(undefined, 2, $.kgw_invitePin);
                        if (resp.helpState && resp.helpState === 1) {
                            $.log("帮【zero205】开工位成功，感谢！\n");
                        } else if (resp.helpState && resp.helpState === 3) {
                            $.log("你不是新用户！跳过开工位助力\n");
                        } else if (resp.helpState && resp.helpState === 2) {
                            $.log(`他的工位已全部开完啦！\n`);
                        } else {
                            $.log("开工位失败！\n");
                            console.log(`${JSON.stringify(resp)}`)
                        }
                    }
                }
            }
            //下地后还有有钱买Joy并且买了Joy
            $.hasJoyCoin = true
            await getJoyBaseInfo(undefined, undefined, undefined, true);
            $.activityJoyList = []
            $.workJoyInfoList = []
            await getJoyList(true);
            await getGameShopList()
            //清理工位
            await doJoyMoveDownAll($.workJoyInfoList)
            //从低合到高
            await doJoyMergeAll($.activityJoyList)
            await getGameMyPrize()
        }
    }
})()
    .catch((e) => $.logErr(e))
    .finally(() => $.done())


async function getJoyBaseInfo(taskId = '', inviteType = '', inviterPin = '', printLog = false) {
    await $.wait(20)
    return new Promise(resolve => {
        $.post(taskPostClientActionUrl(`body={"taskId":"${taskId}","inviteType":"${inviteType}","inviterPin":"${inviterPin}","linkId":"LsQNxL7iWDlXUs6cFl-AAg"}&appid=activities_platform`, `joyBaseInfo`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} getJoyBaseInfo API请求失败，请检查网路重试`)
                    $.joyBaseInfo = undefined;
                } else {
                    data = JSON.parse(data);
                    if (printLog) {
                        $.log(`等级: ${data.data.level}|金币: ${data.data.joyCoin}`);
                        if (data.data.level >= 30 && $.isNode()) {
                            await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}`, `【京东账号${$.index}】${$.nickName || $.UserName}\n当前等级: ${data.data.level}\n已达到单次最高等级奖励\n请前往京东极速版APP查看使用优惠券\n活动入口：京东极速版APP->我的->汪汪乐园`);
                            $.log(`\n开始解锁新场景...\n`);
                            await doJoyRestart()
                        }
                    }
                    $.joyBaseInfo = data.data
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve($.joyBaseInfo);
            }
        })
    })
}

function getJoyList(printLog = false) {
    //await $.wait(20)
    return new Promise(resolve => {
        $.get(taskGetClientActionUrl(`appid=activities_platform&body={"linkId":"LsQNxL7iWDlXUs6cFl-AAg"}`, `joyList`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data);
                    if (printLog) {
                        $.log(`\n===== 【京东账号${$.index}】${$.nickName || $.UserName} joy 状态 start =====`)
                        $.log("在逛街的joy⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️")
                        for (let i = 0; i < data.data.activityJoyList.length; i++) {
                            //$.wait(50);
                            $.log(`id:${data.data.activityJoyList[i].id}|name: ${data.data.activityJoyList[i].name}|level: ${data.data.activityJoyList[i].level}`);
                            if (data.data.activityJoyList[i].level >= 30 && $.isNode()) {
                                await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}`, `【京东账号${$.index}】${$.nickName || $.UserName}\n当前等级: ${data.data.level}\n已达到单次最高等级奖励\n请尽快前往活动查看领取\n活动入口：京东极速版APP->汪汪乐园\n更多脚本->"https://github.com/zero205/JD_tencent_scf"`);
                                $.log(`\n开始解锁新场景...\n`);
                                await doJoyRestart()
                            }
                        }
                        $.log("\n在铲土的joy⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️")
                        for (let i = 0; i < data.data.workJoyInfoList.length; i++) {
                            //$.wait(50)
                            $.log(`工位: ${data.data.workJoyInfoList[i].location} [${data.data.workJoyInfoList[i].unlock ? `已开` : `未开`}]|joy= ${data.data.workJoyInfoList[i].joyDTO ? `id:${data.data.workJoyInfoList[i].joyDTO.id}|name: ${data.data.workJoyInfoList[i].joyDTO.name}|level: ${data.data.workJoyInfoList[i].joyDTO.level}` : `毛都没有`}`)
                        }
                        $.log(`===== 【京东账号${$.index}】${$.nickName || $.UserName} joy 状态  end  =====\n`)
                    }
                    $.activityJoyList = data.data.activityJoyList
                    $.workJoyInfoList = data.data.workJoyInfoList
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data.data);
            }
        })
    })
}

function getGameShopList() {
    //await $.wait(20)
    return new Promise(resolve => {
        $.get(taskGetClientActionUrl(`appid=activities_platform&body={"linkId":"LsQNxL7iWDlXUs6cFl-AAg"}`, `gameShopList`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    //排除不能购买的
                    data = JSON.parse(data).data.filter(row => row.shopStatus === 1);
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}

async function doJoyMoveUpAll(activityJoyList, workJoyInfoList) {
    let workJoyInfoUnlockList = workJoyInfoList.filter(row => row.unlock && row.joyDTO === null)
    if (activityJoyList.length !== 0 && workJoyInfoUnlockList.length !== 0) {
        let maxLevelJoy = Math.max.apply(Math, activityJoyList.map(o => o.level))
        let maxLevelJoyList = activityJoyList.filter(row => row.level === maxLevelJoy)
        $.log(`下地干活！ joyId= ${maxLevelJoyList[0].id} location= ${workJoyInfoUnlockList[0].location}`)
        await doJoyMove(maxLevelJoyList[0].id, workJoyInfoUnlockList[0].location)
        await getJoyList()
        await doJoyMoveUpAll($.activityJoyList, $.workJoyInfoList)
    }
    else if ($.JOY_COIN_MAXIMIZE) {
        await joyCoinMaximize(workJoyInfoUnlockList)
    }

}

async function joyCoinMaximize(workJoyInfoUnlockList) {
    if (workJoyInfoUnlockList.length !== 0 && $.hasJoyCoin) {
        $.log(`竟然还有工位挖土？开启瞎买瞎下地模式！`);
        let joyBaseInfo = await getJoyBaseInfo()
        let joyCoin = joyBaseInfo.joyCoin
        $.log(`还有${joyCoin}金币,看看还能买啥下地`)
        let shopList = await getGameShopList()
        let newBuyCount = false;
        for (let i = shopList.length - 1; i >= 0 && i - 3 >= 0; i--) { //向下买3级
            if (joyCoin > shopList[i].consume) {
                $.log(`买一只 ${shopList[i].userLevel}级的！`);
                joyCoin = joyCoin - shopList[i].consume;
                let buyResp = await doJoyBuy(shopList[i].userLevel);
                if (!buyResp.success) {
                    break;
                } else {
                    newBuyCount = true
                    $.hasJoyCoin = false
                    i++
                }
            }
        }
        $.hasJoyCoin = false
        if (newBuyCount) {
            await getJoyList()
            await doJoyMoveUpAll($.activityJoyList, $.workJoyInfoList)
            await getJoyBaseInfo();
        }
    }
}

async function doJoyMoveDownAll(workJoyInfoList) {
    if (workJoyInfoList.filter(row => row.joyDTO).length === 0) {
        $.log(`工位清理完成！`)
        return true
    }
    for (let i = 0; i < workJoyInfoList.length; i++) {
        //$.wait(50)
        if (workJoyInfoList[i].unlock && workJoyInfoList[i].joyDTO) {
            $.log(`从工位移除 => id:${workJoyInfoList[i].joyDTO.id}|name: ${workJoyInfoList[i].joyDTO.name}|level: ${workJoyInfoList[i].joyDTO.level}`)
            await doJoyMove(workJoyInfoList[i].joyDTO.id, 0)
        }
    }
    //check
    await getJoyList()
    await doJoyMoveDownAll($.workJoyInfoList)
}

async function doJoyMergeAll(activityJoyList) {
    let minLevel = Math.min.apply(Math, activityJoyList.map(o => o.level))
    let joyMinLevelArr = activityJoyList.filter(row => row.level === minLevel);
    let joyBaseInfo = await getJoyBaseInfo()
    let fastBuyLevel = joyBaseInfo.fastBuyLevel
    if (joyMinLevelArr.length >= 2) {
        $.log(`开始合成 ${minLevel} ${joyMinLevelArr[0].id} <=> ${joyMinLevelArr[1].id} 【限流严重，5秒后合成！如失败会重试】`);
        await $.wait(5000)
        await doJoyMerge(joyMinLevelArr[0].id, joyMinLevelArr[1].id);
        if (hot_flag) {
            return
        }
        await getJoyList()
        await doJoyMergeAll($.activityJoyList)
    } else if (joyMinLevelArr.length === 1 && joyMinLevelArr[0].level < fastBuyLevel) {
        let buyResp = await doJoyBuy(joyMinLevelArr[0].level, $.activityJoyList);
        if (buyResp.success) {
            await getJoyList();
            await doJoyMergeAll($.activityJoyList);
        } else {
            $.log("完成！")
            await doJoyMoveUpAll($.activityJoyList, $.workJoyInfoList)
        }
    } else {
        $.log(`没有需要合成的joy 开始买买买🛒🛒🛒🛒🛒🛒🛒🛒`)
        $.log(`现在最高可以购买: ${fastBuyLevel}  购买 ${fastBuyLevel} 的joy   你还有${joyBaseInfo.joyCoin}金币`)
        let buyResp = await doJoyBuy(fastBuyLevel, $.activityJoyList);
        if (buyResp.success) {
            await getJoyList();
            await doJoyMergeAll($.activityJoyList);
        } else {
            $.log("完成！")
            await doJoyMoveUpAll($.activityJoyList, $.workJoyInfoList)
        }
    }
}

function doJoyMove(joyId, location) {
    //await $.wait(20)
    return new Promise(resolve => {
        $.post(taskGetClientActionUrl(`body={"joyId":${joyId},"location":${location},"linkId":"LsQNxL7iWDlXUs6cFl-AAg"}&appid=activities_platform`, `joyMove`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    if (location !== 0) {
                        $.log(`下地完成了！`);
                    }
                    data = JSON.parse(data);
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data.data);
            }
        })
    })
}

function doJoyMerge(joyId1, joyId2) {
    //await $.wait(20)
    return new Promise(resolve => {
        $.get(taskGetClientActionUrl(`body={"joyOneId":${joyId1},"joyTwoId":${joyId2},"linkId":"LsQNxL7iWDlXUs6cFl-AAg"}&appid=activities_platform`, `joyMergeGet`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                    data = {}
                    hot_flag = true
                } else {
                    data = JSON.parse(data);
                    $.log(`合成 ${joyId1} <=> ${joyId2} ${data.success ? `成功！` : `失败！【${data.errMsg}】 code=${data.code}`}`)
                    // if (data.code == '1006') {
                    //   hot_flag = true
                    // }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data.data);
            }
        })
    })
}

async function doJoyBuy(level, activityJoyList) {
    //await $.wait(20)
    return new Promise(resolve => {
        $.post(taskPostClientActionUrl(`body={"level":${level},"linkId":"LsQNxL7iWDlXUs6cFl-AAg"}&appid=activities_platform`, `joyBuy`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data);
                    let codeMsg = '【不知道啥意思】'
                    switch (data.code) {
                        case 519:
                            codeMsg = '【没钱了】';
                            break
                        case 518:
                            codeMsg = '【没空位】';
                            if (activityJoyList) {//正常买模式
                                $.log(`因为购买 ${level}级🐶 没空位 所以我要删掉比低级的狗了`);
                                let minLevel = Math.min.apply(Math, activityJoyList.map(o => o.level))
                                await doJoyRecovery(activityJoyList.filter(row => row.level === minLevel)[0].id);
                            }
                            break
                        case 0:
                            codeMsg = '【OK】';
                            break
                    }

                    $.log(`购买joy level: ${level} ${data.success ? `成功！` : `失败！${data.errMsg} code=${data.code}`}  code的意思是=${codeMsg}`)
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}

function doJoyRecovery(joyId) {
    return new Promise(resolve => {
        $.post(taskPostClientActionUrl(`body={"joyId":${joyId},"linkId":"LsQNxL7iWDlXUs6cFl-AAg"}&appid=activities_platform`, `joyRecovery`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                    data = {}
                } else {
                    data = JSON.parse(data);
                    $.log(`回收🐶 ${data.success ? `成功！` : `失败！【${data.errMsg}】 code=${data.code}`}`)
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}

function doJoyRestart() {
    return new Promise(resolve => {
        $.post(taskPostClientActionUrl(`body={"linkId":"LsQNxL7iWDlXUs6cFl-AAg"}&appid=activities_platform`, `joyRestart`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data);
                    $.log(`新场景解锁 ${data.success ? `成功！` : `失败！【${data.errMsg}】 code=${data.code}`}`)
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}

function getGameMyPrize() {
    return new Promise(resolve => {
        $.post(taskPostClientActionUrl(`body={"linkId":"LsQNxL7iWDlXUs6cFl-AAg"}&appid=activities_platform`, `gameMyPrize`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data);
                    if (data.success && data.data) {
                        $.Vos = data.data.gamePrizeItemVos
                        for (let i = 0; i < $.Vos.length; i++) {
                            if ($.Vos[i].prizeType == 4 && $.Vos[i].status == 1 && $.Vos[i].prizeTypeVO.prizeUsed == 0) {
                                $.log(`\n当前账号有【${$.Vos[i].prizeName}】可提现`)
                                $.id = $.Vos[i].prizeTypeVO.id
                                $.poolBaseId = $.Vos[i].prizeTypeVO.poolBaseId
                                $.prizeGroupId = $.Vos[i].prizeTypeVO.prizeGroupId
                                $.prizeBaseId = $.Vos[i].prizeTypeVO.prizeBaseId
                                await apCashWithDraw($.id, $.poolBaseId, $.prizeGroupId, $.prizeBaseId)
                            }
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}

function apCashWithDraw(id, poolBaseId, prizeGroupId, prizeBaseId) {
    return new Promise(resolve => {
        $.post(taskPostClientActionUrl(`body={"businessSource":"JOY_PARK","base":{"id":${id},"business":"joyPark","poolBaseId":${poolBaseId},"prizeGroupId":${prizeGroupId},"prizeBaseId":${prizeBaseId},"prizeType":4},"linkId":"LsQNxL7iWDlXUs6cFl-AAg"}&_t=${+new Date()}&appid=activities_platform`, `apCashWithDraw`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data);
                    if (data.success && data.data) {
                        console.log(`提现结果：${JSON.stringify(data)}`)
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}

function getShareCode() {
    return new Promise(resolve => {
        $.get({
            url: "https://raw.fastgit.org/zero205/updateTeam/main/shareCodes/joypark.json",
            headers: {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1 Edg/87.0.4280.88"
            }
        }, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`);
                    console.log(`${$.name} API请求失败，请检查网路重试`);
                } else {
                    $.kgw_invitePin = JSON.parse(data);
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}

function taskPostClientActionUrl(body, functionId) {
    return {
        url: `https://api.m.jd.com/client.action?${functionId ? `functionId=${functionId}` : ``}`,
        body: body,
        headers: {
            'User-Agent': $.user_agent,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Host': 'api.m.jd.com',
            'Origin': 'https://joypark.jd.com',
            'Referer': 'https://joypark.jd.com/?activityId=LsQNxL7iWDlXUs6cFl-AAg&lng=113.387899&lat=22.512678&sid=4d76080a9da10fbb31f5cd43396ed6cw&un_area=19_1657_52093_0',
            'Cookie': cookie,
        }
    }
}

function taskGetClientActionUrl(body, functionId) {
    return {
        url: `https://api.m.jd.com/client.action?functionId=${functionId}${body ? `&${body}` : ``}`,
        // body: body,
        headers: {
            'User-Agent': $.user_agent,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Host': 'api.m.jd.com',
            'Origin': 'https://joypark.jd.com',
            'Referer': 'https://joypark.jd.com/?activityId=LsQNxL7iWDlXUs6cFl-AAg&lng=113.388006&lat=22.512549&sid=4d76080a9da10fbb31f5cd43396ed6cw&un_area=19_1657_52093_0',
            'Cookie': cookie,
        }
    }
}

function TotalBean() {
    return new Promise(async resolve => {
        const options = {
            "url": `https://wq.jd.com/user/info/QueryJDUserInfo?sceneval=2`,
            "headers": {
                "Accept": "application/json,text/plain, */*",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept-Encoding": "gzip, deflate, br",
                "Accept-Language": "zh-cn",
                "Connection": "keep-alive",
                "Cookie": cookie,
                "Referer": "https://wqs.jd.com/my/jingdou/my.shtml?sceneval=2",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.2 Mobile/15E148 Safari/604.1"
            }
        }
        $.post(options, (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    if (data) {
                        data = JSON.parse(data);
                        if (data['retcode'] === 13) {
                            $.isLogin = false; //cookie过期
                            return
                        }
                        if (data['retcode'] === 0) {
                            $.nickName = (data['base'] && data['base'].nickname) || $.UserName;
                        } else {
                            $.nickName = $.UserName
                        }
                    } else {
                        console.log(`京东服务器返回空数据`)
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}

function jsonParse(str) {
    if (typeof str == "string") {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.log(e);
            $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
            return [];
        }
    }
}
// prettier-ignore
function Env(t, e) { "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0); class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
