//IMPORTAR MODELOS
const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const Pedido = require('../models/Pedido');

const bcryptjs  =  require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'variables.env'});

const crearToken = (usuario, secreta, expiresIn ) => {
    //console.log(usuario);
    const {id, email, nombre, apellido} = usuario;

    return jwt.sign( { id, email, nombre, apellido }, secreta, { expiresIn } )
}

//RESOLVERS
const resolvers = {
    Query: {
        obtenerUsuario: async (_, {}, ctx) => {
            return ctx.usuario;
        },
        obtenerProductos: async () => {
            try {
                const productos = await Producto.find({});
                return productos;   
            } catch (error) {
                console.log(error)
            }
        },
        obtenerProducto: async (_, { id }) => {
            //REVISAR SI EL PRODUCTO EXISTE O NO
            const producto = await Producto.findById(id);

            if (!producto) {
                throw new Error('Producto no encontrado');
            }

            return producto;
        },
        obtenerClientes: async () => {
            try {
                const clientes = await Cliente.find({});
                return clientes;
            } catch (error) {
                console.log(error)
            }
        },
        obtenerClientesVendedor: async (_,{},ctx) => {
            try {
                const clientes = await Cliente.find({vendedor: ctx.usuario.id.toString()});
                return clientes;
            } catch (error) {
                console.log(error)
            }
        },
        obtenerCliente: async (_, { id }, ctx) => {
            //REVISAR SI EL CLIENTE EXISTE O NO
            const cliente = await Cliente.findById(id);

            if (!cliente) {
                throw new Error('Cliente no encontrado');
            }

            //VALIDAR QUIEN PUEDE VERLO
            if(cliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('Este usuario no tiene acceso a este cliente');
            }

            return cliente;
        },
        obtenerPedidos: async () => {
            try {
                const pedidos = await Pedido.find({});
                return pedidos;
            } catch (error) {
                console.log(error);
            }
        },
        obtenerPedidosVendedor: async (_, {} , ctx) => {
            try {
                const pedidos = await Pedido.find({ vendedor: ctx.usuario.id }).populate('cliente');
                console.log(pedidos);
                return pedidos;
            } catch (error) {
                console.log(error);
            }
        },
        obtenerPedidoId: async (_, {id}, ctx) => {
            //VALIDAR SI EXISTE EL PEDIDO
            const pedido = await Pedido.findById(id);
            if (!pedido) {
                throw new Error('Pedido no encontrado');
            }
            //VALIDAR QUIEN CREO EL PEDIDO
            if (pedido.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('Este usuario no tiene acceso sobre el pedido.');
            }
            //RETORNAR RESULTADO
            return pedido;
        },
        obtenerPedidosEstado: async (_, {estado}, ctx) => {
            const pedidos = await Pedido.find({vendedor: ctx.usuario.id, estado: estado});
            return pedidos;
        },
        mejoresClientes: async () => {
            const clientes = await Pedido.aggregate([
                { $match : { estado: "COMPLETADO"}},
                { $group : {
                    _id: "$cliente",
                    total: { $sum: '$total'}
                }},
                {
                    $lookup: {
                        from: 'clientes',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'cliente'
                    }
                },
                {
                    $limit: 3
                },
                {
                    $sort : { total : -1}
                }
            ]);
            return clientes;
        },
        mejoresVendedores: async () => {
            const vendedores = await Pedido.aggregate([
                { $match : { estado: "COMPLETADO"}},
                { $group : {
                    _id: "$vendedor",
                    total: { $sum: '$total'}
                }},
                {
                    $lookup : {
                        from: 'usuarios',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'vendedor'
                    }
                },
                {
                    $limit: 3
                },
                {
                    $sort : { total : -1}
                }
            ]);
            return vendedores;
        },
        buscarProducto: async (_, {texto}) => {
            const productos = await Producto.find({ $text: { $search: texto } }).limit(10);
            return productos;
        }
    },

    Mutation: {
        nuevoUsuario: async (_, { input} ) => {
            const { email, password } = input;
            //REVISAR SI EL USUARIO ESTA REGISTRADO 
            const existeUsuario = await Usuario.findOne({email});
            if (existeUsuario) {
                throw new Error('El usuario ya esta registrado');
            }

            //HASEAR SU PASSWORD
            const salt = await bcryptjs.genSaltSync(10);
            input.password = await bcryptjs.hashSync(password,salt);
            
            try {
                //GUARDARLO EN LA BASE DE DATOS
                const usuario = new Usuario(input);
                usuario.save(); //REGISTRO GUARDADO
                return usuario;
            } catch (error) {
                console.log(error);
            }
        },
        autenticarUsuario: async (_, { input}) => {
            const { email, password } = input;
            //REVISAR SI EL USUARIO EXISTE
            const existeUsuario = await Usuario.findOne({email});
            if (!existeUsuario) {
                throw new Error('El usuario no esta registrado');
            }

            //REVISAR SI LA CONTRASEÑA ES CORRECTA
            const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password);
            if (!passwordCorrecto) {
                throw new Error('La contraseña es incorrecta');
            }

            //CREAR TOKEN
            return {
                token: crearToken(existeUsuario,process.env.SECRETA,'8h')
            }
        },
        nuevoProducto: async (_, { input}) => {
            try {
                const nuevoProducto = new Producto(input);

                //ALMACENAR EN LA BD
                const producto = await nuevoProducto.save();

                return producto;
            } catch (error) {
                console.log(error);
            }
        },
        actualizarProducto: async (_, { id, input }) => {
            //REVISAR SI EL PRODUCTO EXISTE O NO
            let producto = await Producto.findById(id);

            if (!producto) {
                throw new Error('Producto no encontrado');
            }

            //ACTUALIZAR EN LA BD
            producto = await Producto.findOneAndUpdate({ _id : id }, input, { new: true} );

            return producto;

        },
        eliminarProducto: async (_, { id }) => {
            //REVISAR SI EL PRODUCTO EXISTE O NO
            let producto = await Producto.findById(id);

            if (!producto) {
                throw new Error('Producto no encontrado');
            }

            //ELIMINAR DE LA BD
            await Producto.findOneAndDelete({_id : id});

            return "Producto eliminado correctamente";
        },
        nuevoCliente: async (_, { input}, ctx) => {
            console.log(ctx);
            const { email } = input;
            //VERIFICAR SI EL CLIENTE YA ESTA  REGISTRADO
            const cliente = await Cliente.findOne({ email });
            if (cliente) {
                throw new Error('Este cliente ya ha sido registrado');
            }

            const nuevoCliente = new Cliente(input);

            //ASIGNAR EL VENDEDOR
            nuevoCliente.vendedor = ctx.usuario.id;
            //GUARDARLO EN LA DB
            try {
                
                const resultado = await nuevoCliente.save();

                return resultado;
            } catch (error) {
                console.log(error);
            }
        },
        actualizarCliente: async (_, { id, input}, ctx) => {
            //VERIFICAR SI EXISTE
            let cliente = await Cliente.findById(id);

            if (!cliente) {
                throw new Error('El cliente no ha sido registrado');
            }
            //VERIFICAR EL VENDEDOR AUTORIZADO
            if(cliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('Este usuario no tiene acceso a este cliente');
            }
            //ACTUALIZAR EN LA DB
            cliente = await Cliente.findOneAndUpdate({_id: id}, input, {new: true});
            return cliente;
        },
        eliminarCliente: async (_, { id }, ctx) => {
            //VERIFICAR SI EXISTE
            let cliente = await Cliente.findById(id);

            if (!cliente) {
                throw new Error('El cliente no ha sido registrado');
            }
            //VERIFICAR EL VENDEDOR AUTORIZADO
            if(cliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('Este usuario no tiene acceso a este cliente');
            }
            //ELIMINAR CLIENTE
            await Cliente.findOneAndDelete({_id : id});
            return "Cliente Eliminado Correctamente."
        },
        nuevoPedido : async (_, { input }, ctx) => {
            const {cliente} = input
            //VERIFICAR  SI EL CLIENTE EXISTE O NO
            let clienteExiste = await Cliente.findById(cliente);

            if (!clienteExiste) {
                throw new Error('El cliente no ha sido registrado');
            } 
            //VERIFICAR SI EL CLIENTE ES DEL VENDEDOR
            if(clienteExiste.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('Este vendedor no tiene acceso a este cliente');
            }
            //REVISAR STOCK DISPONIBLE
            for await (const articulo of input.pedido) {
                const { id } = articulo;

                const producto = await Producto.findById(id);
                
                if (articulo.cantidad > producto.existencia) {
                    throw new Error(`El producto: ${producto.nombre} excede la cantidad disponible.`);
                } else {
                    //RESTAR STOCK
                    producto.existencia = producto.existencia - articulo.cantidad;
                    await producto.save();
                }
            };
            //CREAR UN NUEVO PEDIDO
            const nuevoPedido =  new Pedido(input);
            //ASIGNARLE UN VENDEDOR
            nuevoPedido.vendedor = ctx.usuario.id;
            //GUARDARLO EN LA BD
            const resultado = await nuevoPedido.save();
            return resultado;
        },
        actualizarPedido: async (_, {id, input}, ctx) => {
            const { cliente, } = input
            //VERIFICAR SI EL PEDIDO EXISTE           
            const existePedido = await Pedido.findById(id);
            if (!existePedido) {
                throw new Error('Este pedido no existe');
            }
            //VERIFICAR SI EL CLIENTE EXISTE
            let clienteExiste = await Cliente.findById(cliente);
            if (!clienteExiste) {
                throw new Error('Este cliente no existe');
            }
            //VERIFICAR SI EL CLIENTE Y EL PEDIDO PERTENECE AL VENDEDOR
            if(clienteExiste.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('Este vendedor no tiene las credenciales');
            }
            //REVISAR STOCK
            if (input.pedido) {
                for await ( const articulo of input.pedido) {
                    const { id } = articulo;
    
                    const producto = await Producto.findById(id);
                    
                    if (articulo.cantidad > producto.existencia) {
                        throw new Error(`El producto: ${producto.nombre} excede la cantidad disponible.`);
                    } else {
                        //RESTAR STOCK
                        producto.existencia = producto.existencia - articulo.cantidad;
                        await producto.save();
                    }
                };
            }
            
            //ACTUALIZAR EN BD
            const resultado = await Pedido.findOneAndUpdate({_id : id}, input, { new: true });
            return resultado;
        },
        eliminarPedido: async (_, { id }, ctx) => {
            //VERIFICAR SI EL PEDIDO EXISTE
            const pedido = await Pedido.findById(id);
            if (!pedido) {
                throw new Error('Este pedido no existe');
            }

            //VERIFICAR SI EL VENDEDOR ES QUIEN BORRA
            if(pedido.vendedor.toString()!== ctx.usuario.id) {
                throw new Error('Este vendedor no tiene las credenciales');
            }
            //ELIMINAR PEDIDO
            await Pedido.findOneAndDelete({_id : id});
            return "Pedido Eliminado Correctamente."
        }
    } 
    
}

module.exports = resolvers