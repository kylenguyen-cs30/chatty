"use client";
import styles from "./page.module.css";
import React, { useState } from "react";
import JoinRoomModal from "./components/JoinRoomModal";
import ChatRoom from "./components/ChatRoom";
import * as signalR from "@microsoft/signalr";

export default function Home() {
  // isInRoom, roomCode, userName, connection, isCreating
  const [isInRoom, setisInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [userName, setUserName] = useState("");
  const [connection, setConnection] = useState<signalR.HubConnection | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);

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
      connection.stop();
    }

    setisInRoom(false);
    setRoomCode("");
    setUserName("");
    setConnection(null);
  };

  const handleMakeRoom = () => {
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
          {showModal && (
            <JoinRoomModal
              isCreating={isCreating}
              onJoinRoom={handleJoinRoom}
              onClose={handleClose}
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
