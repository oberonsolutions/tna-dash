require('dotenv').config()
const dash = require('@dashevo/dashcore-lib')
const RpcClient = require('bitcoind-rpc');
var fromHash = function(hash, config) {
  let c;
  if (config) {
    c = config;
  } else {
    c = {
      protocol: 'http',
      user: process.env.DASH_USERNAME ? process.env.DASH_USERNAME : 'root',
      pass: process.env.DASH_PASSWORD ? process.env.DASH_PASSWORD : 'dash',
      host: process.env.DASH_IP ? process.env.DASH_IP : '127.0.0.1',
      port: process.env.DASH_PORT ? process.env.DASH_PORT : '9998',
    }
  }
  
  const rpc = new RpcClient(c)
  return new Promise(function(resolve, reject) {
    rpc.getRawTransaction(hash, async function(err, transaction) {
      if (err) {
        console.log("Error: ", err)
      } else {
        let result = await fromTx(transaction.result)
        resolve(result)
      }
    })
  })
}
var fromTx = function(transaction, options) {
  return new Promise(function(resolve, reject) {
    let gene = new dash.Transaction(transaction);
    let t = gene.toObject()
    let result = [];
    let inputs = [];
    let outputs = [];
    let graph = {};
    if (gene.inputs) {
      gene.inputs.forEach(function(input, input_index) {
        if (input.script) {
          let xput = { i: input_index }
          input.script.chunks.forEach(function(c, chunk_index) {
            let chunk = c;
            if (c.buf) {
              xput["b" + chunk_index] = c.buf.toString('base64')
              if (options && options.h && options.h > 0) {
                xput["h" + chunk_index] = c.buf.toString('hex')
              }
            } else {
              if (typeof c.opcodenum !== 'undefined') {
                xput["b" + chunk_index] = {
                  op: c.opcodenum
                }
              } else {
                xput["b" + chunk_index] = c;
              }
            }
          })
          xput.str = input.script.toASM()
          let sender = {
            h: input.prevTxId.toString('hex'),
            i: input.outputIndex
          }
          let address = input.script.toAddress(dash.Networks.livenet).toString(dash.Address.CashAddrFormat).split(':')[1];
          if (address && address.length > 0) {
            sender.a = address;
          }
          xput.e = sender;
          inputs.push(xput)
        }
      })
    }
    if (gene.outputs) {
      gene.outputs.forEach(function(output, output_index) {
        if (output.script) {
          let xput = { i: output_index }
          output.script.chunks.forEach(function(c, chunk_index) {
            let chunk = c;
            if (c.buf) {
              xput["b" + chunk_index] = c.buf.toString('base64')
              xput["s" + chunk_index] = c.buf.toString('utf8')
              if (options && options.h && options.h > 0) {
                xput["h" + chunk_index] = c.buf.toString('hex')
              }
            } else {
              if (typeof c.opcodenum !== 'undefined') {
                xput["b" + chunk_index] = {
                  op: c.opcodenum
                }
              } else {
                xput["b" + chunk_index] = c;
              }
            }
          })
          xput.str = output.script.toASM()
          let receiver = {
            v: output.satoshis,
            i: output_index
          }
          let address = output.script.toAddress(dash.Networks.livenet).toString(dash.Address.CashAddrFormat).split(':')[1];
          if (address && address.length > 0) {
            receiver.a = address;
          }
          xput.e = receiver;
          outputs.push(xput)
        }
      })
    }
    resolve({
      tx: { h: t.hash },
      in: inputs,
      out: outputs
    })
  })
}
module.exports = {
  fromHash: fromHash,
  fromTx: fromTx
}
