const { ApolloServer } = require('apollo-server');
//IMPORTAR SCHEMA.JS
const typeDefs = require('./db/schema');
//IMPORTAR RESOLVERS.JS
const resolvers = require('./db/resolvers');
//IMPORTAR CONEXION
const conectarDB = require('./config/db');
//IMPORTAR JSONWEBTOKEN
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'variables.env'});

//CONECTAR A LA BASE DE DATOS
conectarDB();

//SERVIDOR
const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({req}) => {
        //console.log(req.headers['authorization'])

        const token = req.headers['authorization'] || '';
        if(token){
            try {
                const usuario = jwt.verify(token.replace('Bearer ',''), process.env.SECRETA);
                console.log(usuario);

                return {
                    usuario
                } 

            } catch (error) {
                console.log("Hubo un error: " + error);
            }
        }
    }
});

//ARRANCAR EL SERVIDOR
server.listen({ port: process.env.PORT || 4000}).then( ({url}) => {
    console.log(`Servidor listo en la URL ${url}`)
})