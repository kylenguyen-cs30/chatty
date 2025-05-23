"use client";
import styles from "./JoinRoomModal.module.css";
import React, { useState } from "react";
import * as signalR from "@microsoft/signalr";

interface JoinRoomModalProps {
  isCreating: boolean;
  onJoinRoom: (
    roomCode: string,
    userName: string,
    connection: signalR.HubConnection,
  ) => void;
  onClose: () => void;
  connection: signalR.HubConnection | null;
}

export default function JoinRoomModal({
  isCreating,
  onJoinRoom,
  onClose,
  connection,
}: JoinRoomModalProps) {
  const [roomCode, setRoomCode] = useState<string>("");
  const [userName, setUserName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  //-----------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hubURL: string =
      process.env.NEXT_PUBLIC_SIGNALR_HUB_URL ??
      "http://localhost:8081/chatHub";

    const apiBaseUrl: string =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081";

    console.log("hubURL:", hubURL);
    console.log("apiBaseUrl:", apiBaseUrl);

    // checkpoints
    if (!hubURL || !apiBaseUrl) {
      console.error("Biến môi trường không được định nghĩa.");
      setError("Lỗi cấu hình server!");
      setIsLoading(false);
      return;
    }

    if (!userName) {
      setError("Vui lòng nhập tên người dùng!");
      setIsLoading(false);
      return;
    }

    if (!isCreating && !roomCode) {
      setError("Vui lòng nhập mã phòng!");
      setIsLoading(false);
      return;
    }

    console.log("trạng tháng của Connection :", connection?.state);
    if (!connection) {
      setError("Không thể kết nối tới Server : Kết nối chưa được khởi tạo");
      setIsLoading(false);
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
        console.log("Response từ API:", data);

        // lỗi tạo phòng từ Server
        if (!response.ok) {
          throw new Error(data.message || "Khong the tao phong");
        }

        // checkpoints để coi roomCode có bị null không
        if (!data.roomCode || typeof data.roomCode !== "string") {
          throw new Error("Mã phòng không hợp lệ từ Server ");
        }

        finalRoomCode = data.roomCode;
        console.log(`Nhan duoc ma phong ${finalRoomCode}`);
        setRoomCode(finalRoomCode);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Lỗi kết nối tới Server (ở vị trí khung tạo phòng )";
        setError(errorMessage || "khong tao phong duoc");
        console.error("LOI: RoomCode khong tao duoc", error);
        connection
          .stop()
          .catch((error) =>
            console.error(
              "Thần backend ơi nói cho ta biết, mày bị gì ?? ",
              error,
            ),
          );
        setIsLoading(false);
        return;
      }
    }

    if (!finalRoomCode) {
      setError("Mã phòng không hợp lệ ");
      setIsLoading(false);
      return;
    }
    try {
      console.log("Đang kết nối tới SignalR");

      if (connection.state !== signalR.HubConnectionState.Disconnected) {
        console.log(
          `Kết nối đang ở trạng thái ${connection.state}, đang dừng...`,
        );
        await connection.stop();
      }

      await Promise.race([
        connection.start(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Ket noi signalR time out")), 5000),
        ),
      ]);
      console.log("Kết nối đã thành công, đang gọi joinRoom");
      await connection.invoke("JoinRoom", finalRoomCode, userName); //invoke là method để call function trong api request
      onJoinRoom(finalRoomCode, userName, connection);
    } catch (error) {
      setError("Failed to connect server");
      console.error("THONG BAO LOI : ", error);
      connection
        .stop()
        .catch((error) =>
          console.error(
            "Lỗi dừng kết nối Server (Vị trí hàm tạo invoke )",
            error,
          ),
        );
      setIsLoading(false);
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
          {!isCreating && (
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
                placeholder="Enter Room Code"
                disabled={isCreating}
              />
            </div>
          )}

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
              disabled={isLoading}
            >
              {isLoading ? "Đang xử lí" : isCreating ? "Create" : "Join"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
