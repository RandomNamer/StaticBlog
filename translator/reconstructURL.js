const AxiosReq = require('axios').default
const baseUrl = "https://m.dmzj.com/view/17941/558"
const suffix = '.html'
const failedResp = "漫画不存在"

trial();

async function trial(){
    for(var i = 0; i < 10; i++){
        let resp = await AxiosReq.get(baseUrl + 0 + i + suffix).catch( e=> 
            console.log(e) )
        failedResp !== resp.data ? console.log(`Found the link, ${i}`, resp.data) : console.log(resp.data)
    }
    for(var i = 10; i < 100; i++){
        let resp = await AxiosReq.get(baseUrl + i + suffix).catch( e=> 
            console.log(e) )
        failedResp !== resp.data ? console.log(`Found the link, ${i}`, resp.data) : console.log(resp.data)
    }
}
