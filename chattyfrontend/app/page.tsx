"use client";
import styles from "./page.module.css";
import React, { useEffect, useState } from "react";
import JoinRoomModal from "./components/JoinRoomModal";
import ChatRoom from "./components/ChatRoom";
import * as signalR from "@microsoft/signalr";

export default function Home() {
  const [isInRoom, setisInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [userName, setUserName] = useState("");
  const [connection, setConnection] = useState<signalR.HubConnection | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isConnectionReady, setIsConnectionReady] = useState(false);

  // Khởi tạo và quản lý HubConnection
  useEffect(() => {
    const hubURL: string =
      process.env.NEXT_PUBLIC_SIGNALR_HUB_URL ??
      "http://localhost:8081/chatHub";

    console.log("hubURL: ", hubURL);

    // checkpoints
    if (!hubURL) {
      console.error("Biến môi trường không được định nghĩa.");
      return;
    }

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubURL, { withCredentials: false })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    newConnection.on("JoinedRoom", (joinedRoomCode: string) => {
      console.log("đã tham gia phòng thành công");
      setRoomCode(joinedRoomCode);
      setisInRoom(true);
      setShowModal(false);
    });

    newConnection.on("UserJoined", (user: string) => {
      console.log(`Nguoi dung tham gia phong: ${user}`);
    });

    newConnection.on("Error", (message: string) => {
      console.error(`Lỗi từ server: ${message}`);
    });

    // khoi dong ket noi khi component mount
    const startConnection = async () => {
      try {
        if (newConnection.state !== signalR.HubConnectionState.Disconnected) {
          console.log(
            `Ket noi dang o trang thai ${newConnection.state}, dung...`,
          );
          await newConnection.stop();
        }

        console.log("Khoi Dong ket noi signalR...");
        await newConnection.start();
        console.log("Kết nối Server thành công");
        setConnection(newConnection);
        setIsConnectionReady(true);
      } catch (error) {
        console.error("Loi khi khoi dong ket noi", error);
      }
    };

    startConnection();

    return () => {
      if (newConnection.state !== signalR.HubConnectionState.Disconnected) {
        newConnection
          .stop()
          .catch((err) => console.error("Loi khi dung ket noi", err));
      }
      setConnection(null);
    };
  }, []);

  const handleJoinRoom = (
    roomCode: string,
    userName: string,
    connection: signalR.HubConnection,
  ) => {
    setRoomCode(roomCode);
    setUserName(userName);
    setConnection(connection);
    setisInRoom(true);
    setShowModal(false);
  };

  const handleLeaveRoom = () => {
    if (connection) {
      connection
        .stop()
        .catch((err) => console.error("Lỗi khi dừng kết nối ", err));
    }

    setisInRoom(false);
    setRoomCode("");
    setUserName("");
    setConnection(null);
  };

  const handleMakeRoom = () => {
    if (!isConnectionReady) {
      console.log("đang chờ kết nối...");
      return;
    }
    setIsCreating(true);
    setShowModal(true);
  };

  // đóng cửa sổ Modal lại
  const handleClose = () => {
    setShowModal(false);
    setIsCreating(false);
  };

  return (
    <div className={styles.container}>
      {!isInRoom ? (
        <>
          <div className={styles.maindiv}>
            <h1 className={styles.welcomeText}>Welcome To Chatty</h1>
            <h2 className={styles.question}>Do you have room code ?</h2>
            <div className={styles.buttonDiv}>
              <button
                className={styles.button}
                onClick={() => setShowModal(true)}
                aria-label="Join Button YES"
              >
                Yes (Join)
              </button>
              <button
                className={styles.button}
                onClick={handleMakeRoom}
                aria-label="Makeroom button NO"
              >
                No (Make)
              </button>
            </div>
          </div>
          {showModal && isConnectionReady && (
            <JoinRoomModal
              isCreating={isCreating}
              onJoinRoom={handleJoinRoom}
              onClose={handleClose}
              connection={connection}
            />
          )}
        </>
      ) : (
        /* Chatroom component */
        <ChatRoom
          roomCode={roomCode}
          userName={userName}
          connection={connection}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </div>
  );
}
