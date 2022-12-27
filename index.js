const port = 8100;
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const mysql = require('mysql2/promise')
const {json} = require("express");

const app = express();
const sql = 'INSERT INTO noticias' +
    '(link, titulo, resumo, imagem)' +
    'VALUES(?,?,?,?);'
const bd = {
    host: 'ls-e851ddb02fd4d49a96c3163cc370267222346ec9.cgdralyueyam.us-east-1.rds.amazonaws.com',
    user: 'dbmasteruser',
    password: 'nov2020slash',
    database: 'ocatarina'
}


app.get('/', (req, res) =>{
    const noticias = []
        //Pega a lista de notícias.
        axios.get('https://g1.globo.com/sc/santa-catarina/').then((response) => {

            const html = response.data
            const $ = cheerio.load(html)
            const elementos = $('div.medium-uncollapse a, div.large-uncollapse a', html)
            // Itera pelas notícias.
            console.log(elementos.length + ' elementos sujos')

            elementos.each(async function (index) {

                var noticia = []
                var titulo = ''
                var resumo = ''
                var imagem = ''

                if ($(this).attr('href') !== undefined) {
                    if ($(this).attr('href').includes('noticia')) {

                        console.log(index + '<>><><><' + $(this).attr('href'))
                        for (let indexx = 0; indexx < elementos.length; indexx++) {
                            if(indexx != index){
                                if($(this).attr('href') === $(elementos[indexx]).attr('href')){
                                        console.log('<<<------>>>')
                                        // console.log($(this).attr('href'))
                                        // console.log( $(elemento).attr('href'))
                                        $(elementos[indexx]).attr('href', 'https://g1.globo.com')
                                        console.log(indexx + '/' + $(elementos[indexx]).attr('href'))
                                        console.log('------')
                                    }
                                }

                        }
                        // console.log(elementos.length + ' elementos limpos')


                        // Pega o link
                        var link = $(this).attr('href')
                        noticia.push(link)
                        axios.get($(this).attr('href')).then((responseNot) => {
                            var htmlNot = responseNot.data
                            var $n = cheerio.load(htmlNot)
                            // Pega o título
                            titulo = $n('.content-head__title', htmlNot).text();
                            noticia.push(titulo)

                            // Pega o resumo
                            resumo = $n('.content-head__subtitle', htmlNot).text()
                            noticia.push(resumo)

                            // Pega a imagem
                            imagem = $n('amp-img', htmlNot).first().attr('src')
                            noticia.push(imagem)
                            console.log('<' + link)
                            console.log('<' + titulo)
                            console.log('<' + resumo)
                            console.log('<' + imagem)
                            insere(link, titulo, resumo, imagem)

                            // Inclui tudo no array final
                            noticias[index] = noticia
                        }).then(async function () {

                        }).catch((err) => console.log(err))
                    }
                }
            })

            async function insere(link, titulo, resumo, imagem) {
                let connection = await mysql.createConnection(bd)
                let [rows, fields] =  await connection.execute("SELECT * FROM noticias where link = '" + link + "'")
                connection.end()
                console.log(rows.length)
                if (rows.length == 0) {
                    console.log('nao tem')
                    let connection = await mysql.createConnection(bd)
                    console.log('>' + link)
                    console.log('>' + titulo)
                    console.log('>' + resumo)
                    console.log('>' + imagem)
                    let ins = await connection.execute(sql, [link, titulo, resumo, imagem])
                    connection.end()
                    return ins
                } else {
                    console.log('ja tem')
                }
            }

            res.json(noticias)
        }).catch((err) => console.log(err))

})

app.listen(port, ()=> console.log('Running on port ' + port))
