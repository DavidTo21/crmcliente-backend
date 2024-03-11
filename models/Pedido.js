const mongoose = require('mongoose');

const ProductoSchema = mongoose.Schema({
    pedido: {
        type: Array,
        required: true
    },
    total: {
        type: Number,
        required: true
    },
    cliente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cliente',
        required: true
    },
    vendedor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    estado: {
        type: String,
        default: "PENDIENTE"
    },
    creado: {
        type: Date,
        default: Date.now()
    }
});

module.exports = mongoose.model('Pedido', ProductoSchema);