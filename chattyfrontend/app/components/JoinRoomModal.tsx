"use client";
import styles from "./JoinRoomModal.module.css";
import React, { useState, useEffect } from "react";
import * as signalR from "@microsoft/signalr";
import { connection } from "next/server";

interface JoinRoomModalProps {
  isCreating: boolean;
  onJoinRoom: (
    roomCode: string,
    userName: string,
    connection: signalR.HubConnection,
  ) => void;
  onClose: () => void;
}

export default function JoinRoomModal({
  isCreating,
  onJoinRoom,
  onClose,
}: JoinRoomModalProps) {
  const [roomCode, setRoomCode] = useState(
    isCreating ? generateRoomCode() : "",
  );

  const [userName, setUserName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode || !userName) {
      setError("Please enter your username and room code!!");
      return;
    }

    // tạo đối tượng connection cho signalR
    const connection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5085/chatHub")
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information) // add more loggin
      .build();

    connection.on("JoinedRoom", (joinedRoomCode: string) => {
      console.log("đã tham gia phòng thành công");
      onJoinRoom(joinedRoomCode, userName, connection);
    });

    connection.on("UserJoined", (user: string) => {
      console.log("Người tham gia:", user);
    });

    // Error Handler
    connection.on("Error", (message: string) => {
      console.error("LỖI: Kiểm Tra signalR Client");
      setError(message);
      connection.stop();
    });

    try {
      console.log("Đang kết nối tới SignalR");
      await connection.start();
      console.log("Kết nối đã thành công, đang gọi joinRoom");
      await connection.invoke("JoinRoom", roomCode, userName); //invoke là method để call function trong api request
    } catch (error) {
      setError("Failed to connect server");
    }
  };

  return (
    <div className={styles["modal-div"]}>
      <div className={styles["inner-modal-div"]}>
        <h2 className={styles["make-join-chatroom-text"]}>
          {isCreating ? "Make Room" : "Join Room"}
        </h2>
        {error && <p className={styles["error-text"]}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div>
            <label htmlFor="roomCode" className={styles.formlabel}>
              Room Code
            </label>
            <input
              type="text"
              value={roomCode}
              id="roomCode"
              onChange={(e) => setRoomCode(e.target.value)}
              className={styles.formInput}
              readOnly={isCreating}
              placeholder="Enter or Generate Room Code"
            />
          </div>
          <div>
            <label htmlFor="userName" className={styles.formlabel}>
              User Name
            </label>
            <input
              type="text"
              value={userName}
              id="userName"
              className={styles.formInput}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your User Name"
            />
          </div>

          {/* Cancel Button  */}
          <div className={styles["button-div"]}>
            <button
              type="button"
              className={styles.cancelbutton}
              onClick={onClose}
              aria-label="Cancel Button"
            >
              Cancel
            </button>

            <button
              type="submit"
              className={styles.submitbutton}
              aria-label="Submit button"
            >
              {isCreating ? "Create" : "Join"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
