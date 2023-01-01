const port = 8100;
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const mysql = require('mysql2/promise')
const {json} = require("express");

const nodeSchedule = require('node-schedule');

const app = express();

const bd = {
    host: 'ls-e851ddb02fd4d49a96c3163cc370267222346ec9.cgdralyueyam.us-east-1.rds.amazonaws.com',
    user: 'dbmasteruser',
    password: 'nov2020slash',
    database: 'ocatarina'
}


app.get('/', (req, res) =>{

    scrapG1()
    scrapND()

    res.json(true)
})

function scrapG1(){
    //Pega a lista de notícias.
    axios.get('https://g1.globo.com/sc/santa-catarina/').then((response) => {
        const html = response.data
        const $ = cheerio.load(html)
        const elementos = $('div.medium-uncollapse a, div.large-uncollapse a', html)
        logExec(elementos.length, 'G1')
        // Itera pelas notícias.
        elementos.each(async function (index) {
            var titulo = ''
            var resumo = ''
            var imagem = ''

            if ($(this).attr('href') !== undefined) {
                if ($(this).attr('href').includes('noticia')) {

                    for (let indexx = 0; indexx < elementos.length; indexx++) {
                        if (indexx != index) {
                            if ($(this).attr('href') === $(elementos[indexx]).attr('href')) {
                                $(elementos[indexx]).attr('href', 'https://g1.globo.com')
                            }
                        }
                    }

                    // Pega o link
                    var link = $(this).attr('href')
                    axios.get($(this).attr('href')).then((responseNot) => {
                        var htmlNot = responseNot.data
                        var $n = cheerio.load(htmlNot)
                        // Pega o título
                        titulo = $n('.content-head__title', htmlNot).text();

                        // Pega o resumo
                        resumo = $n('.content-head__subtitle', htmlNot).text()

                        // Pega a imagem
                        imagem = $n('amp-img', htmlNot).first().attr('src')
                        insere(link, titulo, resumo, imagem, 'G1')

                        // Inclui tudo no array final
                    }).then(async function () {

                    }).catch((err) => console.log(err))
                }
            }
        })

    }).catch((err) => console.log(err))
}

function scrapND(){
    //Pega a lista de notícias.
    axios.get('https://ndmais.com.br/santa-catarina/').then((response) => {
        const html = response.data
        const $ = cheerio.load(html)
        const elementos = $('.title', html)
        logExec(elementos.length, 'ND+')
        // Itera pelas notícias.
        elementos.each(async function (index) {
            var titulo = ''
            var resumo = ''
            var imagem = ''

            if ($(this).attr('href') !== undefined) {
                if ($(this).attr('href').includes('ndmais')) {

                    for (let indexx = 0; indexx < elementos.length; indexx++) {
                        if (indexx != index) {
                            if ($(this).attr('href') === $(elementos[indexx]).attr('href')) {
                                $(elementos[indexx]).attr('href', 'https://g1.globo.com')
                            }
                        }
                    }

                    // Pega o link
                    var link = $(this).attr('href')
                    axios.get($(this).attr('href')).then((responseNot) => {
                        var htmlNot = responseNot.data
                        var $n = cheerio.load(htmlNot)
                        // Pega o título
                        titulo = $n('h1.title', htmlNot).text();

                        // Pega o resumo
                        resumo = $n('.single-excerpt', htmlNot).text()
                        if (resumo.length < 1){
                            resumo = $n('.single-content p', htmlNot).text()
                            if (resumo.length > 240){
                                resumo = '';
                                $n('.single-content p', htmlNot).text().split('. ').forEach( function(frase, indice) {
                                    if (resumo.length + frase.length < 238){
                                        resumo = resumo  +  frase + '. '
                                    }
                                })
                            }
                        }
                        // Pega a imagem
                        imagem = $n('article img', htmlNot).first().attr('src')
                        if (imagem == undefined){
                            imagem = $n('article', htmlNot).find('img:first').attr('src')
                            if (imagem == undefined || imagem.length < 1){
                                imagem = null
                            }
                        }
                        insere(link, titulo, resumo, imagem, 'ND+')

                        // Inclui tudo no array final
                    }).then(async function () {

                    }).catch((err) => console.log(err))
                }
            }
        })

    }).catch((err) => console.log(err))
}

// Salva uma notícia no banco.
async function insere(link, titulo, resumo, imagem, fonte) {
    const sql = 'INSERT INTO noticias' +
        '(link, titulo, resumo, imagem, fonte)' +
        'VALUES(?,?,?,?,?);'
    let connection = await mysql.createConnection(bd)
    let [rows, fields] = await connection.execute("SELECT * FROM noticias where link = '" + link + "'")
    connection.end()

    if (rows.length == 0) {
        let connection = await mysql.createConnection(bd)
        let ins = await connection.execute(sql, [link, titulo, resumo, imagem, fonte])
        connection.end()
        return ins
    }

}

// Insere registro no banco acusando a execução.
async function logExec(numElementos, fonte) {
    let connection = await mysql.createConnection(bd)
    let ins = await connection.execute('INSERT INTO execucao' +
        '(numElementos, fonte)' +
        'VALUES(?,?);', [numElementos, fonte])
    connection.end()
    return ins
}
app.listen(port, ()=> console.log('Running on port ' + port))
