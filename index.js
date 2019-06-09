//import express 和 ws 套件
const express = require('express')
const SocketServer = require('ws').Server

//指定開啟的 port
const PORT = 3000

//創建 express 的物件，並綁定及監聽 3000 port ，且設定開啟後在 console 中提示
const server = express()
    .listen(PORT, () => console.log(`Listening on ${PORT}`))

//將 express 交給 SocketServer 開啟 WebSocket 的服務
const wss = new SocketServer({ server })
let room=[];
/*
  room 為object array
  每個object為
  {
      room:房間號碼,
      master:{
        ws:...,
        user_name:
      }
      device:物件陣列
      [{
        ws:這個device的ws,
        user_name:名稱,
        track:第幾軌,
        uid:
      }]
  }
*/
//當 WebSocket 從外部連結時執行
wss.on('connection', ws => {

    //連結時執行此 console 提示
    ws.name=Math.floor(Math.random() * 10000) + 1 ;
    ws.uid=ws.name;
    ws.room='-1';
    ws.track=-1;
    console.log('Client '+ws.name+' connected')
    //對 message 設定監聽，接收從 Client 發送的訊息
    let index=-1;
    let i=0;
  ws.on('message', data => {
      //data 為 Client 發送的訊息，現在將訊息原封不動發送出去
      //ws.send(data)
      let clients = wss.clients;
      data=JSON.parse(data);
      console.log('event is '+data.event);
      //console.log(data);
      //console.log('client '+ws.id+' say '+data.data);
      switch (data.event) {
        case 'join_room':
              let flag=0;
                ws.room=data.room;
                room.forEach(r=>{
                      if(r.room==ws.room){
                          //console.log("room exist");
                          //console.log(r);

                          console.log("send user info to master");
                          //將新加入的用戶資料送給master
                          let length=r.device.length;
                          ws.track=r.number.pop();
                          let msg={};
                          msg.event="device_join";
                          msg.data={user_name:ws.name, track:ws.track ,uid:ws.uid};
                          console.log(msg);
                          r.master.ws.send(JSON.stringify(msg));


                          r.device.forEach(d=>{
                                //d是已經在房間的device
                              //console.log("send msg to id ",d.user_name);
                              //將正要加入的用戶資料送給原本就在房間裡的用戶
                              let msg={};
                              msg.event="device_join";
                              msg.data={user_name:ws.name, track:ws.track,  uid:ws.uid};
                              d.ws.send(JSON.stringify(msg));
                            //  console.log("send msg to ",d.user_name);
                            //  console.log(msg);
                              //將原本就在房間裡用戶的資料送給正要加入的用戶
                              let msg2={};
                              msg2.event="device_join";
                              msg2.data={user_name:d.user_name, track:d.track ,uid:d.uid};
                              ws.send(JSON.stringify(msg2));
                              console.log("send msg to ",ws.name);
                              console.log(msg2);
                          })
                            r.device.push({ws:ws,user_name:ws.name,track:ws.track,uid:ws.uid})
                            let msg3={};
                            msg3.event="device_join";
                            msg3.data={user_name:ws.user_name, track:ws.track ,uid:ws.uid};
                            ws.send(JSON.stringify(msg3));
                          return false;
                      }
                })



                // room[ws.room].forEach(client=>{
                //   if(client.room==data.room && client.id!=ws.id){
                //           console.log("send msg to id ",client.id);
                //           let msg={};
                //           msg.event="device_join";
                //           msg.data={user_name:client.id,track:client.id};
                //           client.send(JSON.stringify(msg));
                // }})
                // clients.forEach(client => {
                //       if(client.room==data.room && client.id!=ws.id){
                //         console.log("send msg to id ",client.id);
                //         let msg={};
                //         msg.event="device_join";
                //         msg.data={user_name:client.id,track:client.id};
                //         client.send(JSON.stringify(msg));
                //       }
                // })
        break;
        case 'create_room':
            ws.room=data.room;
              room.push({room:data.room, master:{ws:ws,  user_name:"master"},device:[], number:[3,2,1], disconnected_device:[] });
            console.log("create room");
        break;

        case "ch_name":
        room.forEach(r=>{
              if(r.room==ws.room){
                  let msg={};
                  msg.event="ch_name";
                  msg.uid=ws.uid;
                  msg.new_name=data.new_name;
                  r.master.ws.send(JSON.stringify(msg));
                  r.device.forEach(d=>{
                        //d是已經在房間的device
                        // if(d.ws==ws){
                        //   d.user_name=data.new_name;
                        //   console.log("me");
                        // }else{
                          console.log("send to origin recorder");
                          d.ws.send(JSON.stringify(msg));
                        // }
                  })
                  return false;
              }
        })
        break;

        case "all_start":
          console.log("all start");

          room.forEach(r=>{
              if(r.room==ws.room){
                console.log("room find");
                let msg={};
                msg.event="start";
                r.device.forEach(d=>{
                    console.log("send to ",d.user_name);
                  d.ws.send(JSON.stringify(msg));
                })

              }
          })
        break;

        case "all_stop":
          console.log("all stop");
          room.forEach(r=>{
              if(r.room==ws.room){
                let msg={};
                msg.event="stop";
                r.device.forEach(d=>{
                  d.ws.send(JSON.stringify(msg));
                })
              }
          })
        break;

        case "all_close":
          console.log("all close");
           index=-1;
           i=0;
          room.forEach(r=>{
              if(r.room==ws.room){
                let msg={};
                msg.event="all_close";
                r.device.forEach(d=>{
                  d.ws.send(JSON.stringify(msg));
                })
                return false;
                index=i;
              }
              i++;
          })
          if(index>=0)room.splice(index,1);
        break;

        case "close":
          console.log("one close");
           index=-1;
           i=0;
          room.forEach(r=>{
              if(r.room==ws.room){
                  let msg={};
                  msg.event="device_leave";
                  msg.uid=ws.uid;
                  console.log("master ",r.master.user_name);
                  r.master.ws.send(JSON.stringify(msg));
                  r.device.forEach(d=>{
                    if(d.uid!=ws.uid){
                    //  console.log("not equal");
                      d.ws.send(JSON.stringify(msg));
                      i++
                    }
                    else{
                      index=i;
                      //console.log("euq");
                      r.disconnected_device.push(d);
                      r.number.push(d.track);
                      r.number=r.number.sort(function (a, b) {
                        return b - a //順序反轉
                      });
                      console.log(r.number);
                    }
                  })
                if(index>=0)room.splice(index,1);  r.device.splice(index,1);
                return false;
              }
          })
        break

        case 'send':
            console.log(ws.id+' want to send message '+data.data+' to '+data.recieve_id);
            //let clients = wss.clients;

            clients.forEach(client => {
                  if(client.id==data.recieve_id){
                    let msg={};
                    msg.data=data.data;
                    client.send(JSON.stringify(msg));
                  }
            })

        break;

        default:
          console.log(data);

      }
  })


    //當 WebSocket 的連線關閉時執行
    ws.on('close', () => {
        console.log('Close connected')
    })
})
