"use client";
import styles from "./JoinRoomModal.module.css";
import React, { useState } from "react";
import * as signalR from "@microsoft/signalr";
import { rejects } from "assert";

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
  const [roomCode, setRoomCode] = useState<string>("");
  const [userName, setUserName] = useState("");
  const [error, setError] = useState<string | null>(null);

  //-----------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hubURL: string =
      process.env.NEXT_PUBLIC_SIGNALR_HUB_URL ??
      "http://localhost:8080/chatHub";

    const apiBaseUrl: string =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

    if (!hubURL) {
      console.error(
        "Biến môi trường không được định nghĩa. check lại build hubURL",
      );
      return;
    }

    if (!apiBaseUrl) {
      console.error(
        "Biến môi trường không được định nghĩa. check lại build apiBaseUrl",
      );
      return;
    }

    if (!isCreating && !roomCode) {
      setError("Please enter RoomCode");
      return;
    }

    if (!userName) {
      setError("Vui long nhap ten nguoi dung!!");
      return;
    }

    if (!roomCode || !userName) {
      setError("Please enter your username and room code!!");
      return;
    }

    let finalRoomCode = roomCode;

    if (isCreating) {
      try {
        console.log("Gui yeu cau toi apiBaseUrl");
        const response = await fetch(`${apiBaseUrl}/api/rooms/create`, {
          method: "POST",
          headers: { "Content-Type": "Application/json" },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Khong the tao phong");
        }

        finalRoomCode = data.RoomCode;
        console.log(`Nhan duoc ma phong ${finalRoomCode}`);
        setRoomCode(finalRoomCode);
      } catch (error: any) {
        setError(error.message || "khong tao phong duoc");
        console.error("LOI: RoomCode khong tao duoc", error);
        return;
      }
    }

    // tạo đối tượng connection cho signalR
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubURL, { withCredentials: false })
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

      await Promise.race([
        connection.start(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Ket noi signalR time out")), 5000),
        ),
      ]);
      await connection.start();
      console.log("Kết nối đã thành công, đang gọi joinRoom");
      await connection.invoke("JoinRoom", finalRoomCode, userName); //invoke là method để call function trong api request
    } catch (error) {
      setError("Failed to connect server");
      console.error("THONG BAO LOI : ", error);
    }
  };
  //-----------------------------------------------------------

  return (
    <div className={styles["modal-overlay"]}>
      <div className={styles["modal-content"]}>
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
