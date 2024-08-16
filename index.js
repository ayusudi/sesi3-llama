import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import dotenv from 'dotenv'
import { html, raw } from "hono/html";
import { getWeather } from './api.js';
import { generate } from './groq.js'
import fs from 'node:fs'
import { parse } from "marked"
dotenv.config();

const app = new Hono()

// middleware 
app.use(async function (ctx, next) {
  ctx.setRenderer(function (content) {
    const template = fs.readFileSync("./template.html", "utf-8") // create file template.html manually
      // @ts-ignore
      .replace("{{content}}", content);
    return ctx.html(template);
  });
  await next();
});

app.get('/', async (c) => {
  let location = c.req.query('location') || "Jakarta"
  let data = await getWeather(location)
  let prompt = `
  You are an assistant for Weather App 
  Please help user to get recommendation on suitable activities, clothes, tools and preparation. 

  Here is the detail of the weather 
  - Location : ${location}
  - Temperature : ${data.temp}
  - Humidity : ${data.humidity}
  - Description : ${data.description}
  - Max Temperature : ${data.tempmax}

  Make the report short and engaging!
  `
  let responseLLM = await generate(prompt)
  let htmlresponse = parse(responseLLM)

  let objImage = {
    Jakarta: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Jakarta_Skyline_Part_2.jpg/1200px-Jakarta_Skyline_Part_2.jpg",
    Bandung: "https://miro.medium.com/v2/resize:fit:1400/1*4ht7Dmp4V_BX-8Iy0YZ37w.jpeg",
    Bogor: "https://thumb.viva.id/antvklik/665x374/2021/06/30/62e82e731fc93-tugu-kujang-kota-bogor-penutupan-total-mulai-pukul-21-00-sd-24-00-wib_.jpg"
  }
  let objVideo = {
    Jakarta: "https://www.youtube.com/embed/6PRvQI-0bZg?si=rRyXMxHPwOgl1Wwa",
    Bandung: "https://www.youtube.com/embed/g635BMEZPcQ?si=xtzPRuASyXvjleKP",
    Bogor: "https://www.youtube.com/embed/g635BMEZPcQ?si=xtzPRuASyXvjleKP"
  }
  let sourceImage = objImage[location]
  let sourceVideo = objVideo[location]
  return c.render(
    html`
    <img src="${sourceImage}" alt="${location}"/>
    <table>
    <tr>
      <td>Location</td> 
      <td>${location}</td> 
    </tr>
     <tr>
      <td>Temperature</td> 
      <td>${data.temp}</td> 
    </tr>
    <table/>
    ${raw(htmlresponse)}
    <iframe width="560" height="315" src="${sourceVideo}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    `
  )
})

const port = 3000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
