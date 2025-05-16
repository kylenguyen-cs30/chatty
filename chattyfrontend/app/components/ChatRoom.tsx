"use client";
import { useState, useEffect, useRef } from "react";
import styles from "./ChatrRoom.module.css";

interface ChatRoomProps {
  roomCode: string;
  userName: string;
  connection: signalR.HubConnection | null;
  onLeaveRoom: () => void;
}

export default function ChatRoom({
  roomCode,
  userName,
  connection,
  onLeaveRoom,
}: ChatRoomProps) {
  // messages, newMessage, messageEndRef
  const [messages, setMessages] = useState<{ user: string; message: string }[]>(
    [],
  );
  const [newMessage, setNewMessage] = useState("");
  const messageEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // hàm đăng kí sự kiện signalr để lắng nghe hoạt động từ Server. [Event Driven Design]
    if (connection) {
      // xu li khi nguoi dung moi tham gia
      connection.on("UserJoined", (user: string) => {
        console.log("Người dùng tham gia");
        setMessages((prev) => [
          ...prev,
          { user: "System", message: `${user} joined the room` },
        ]);
      });

      // xu li khi tin nhan moi nhan duoc
      connection.on("ReceiveMessage", (user: string, message: string) => {
        console.log("Tin nhắn nhận được");
        setMessages((prev) => [...prev, { user, message }]);
      });

      // xu li khi phong bi huy
      connection.on("RoomDeconstructed", (message: string) => {
        setMessages((prev) => [...prev, { user: "System", message }]);
        setTimeout(() => {
          onLeaveRoom();
        }, 2000);
      });

      // xu li khi nguoi dung roi phong
      connection.on("UserLeft", (connectionId: string) => {
        console.log("Người dùng đã rời khỏi phòng chat");
        setMessages((prev) => [
          ...prev,
          { user: "System", message: `user ${connectionId} left` },
        ]);
      });

      return () => {
        connection.off("UserJoined");
        connection.off("ReceiveMessage");
        connection.off("RoomDeconstructed");
        connection.off("UserLeft");
      };
    }
  }, [connection, onLeaveRoom]);

  // tin nhắn mới sẽ tự động kéo màn hình của tin nhắn xuống dưới đáy.
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    // white space trim
    if (!newMessage.trim()) {
      return;
    }

    if (!connection) {
      console.error("LỖI: Kết nối SignalR chưa được thiết lập.");
      return;
    }

    try {
      await connection.invoke("SendMessage", roomCode, userName, newMessage);
      setNewMessage("");
    } catch (error) {
      console.error("LỖI: có lỗi xảy ở hàm handleMessage()", error);
    }
  };

  return (
    <div className={styles["chat-div"]}>
      {/* ChatRoom Div */}
      <div className={styles["chatroom-info-div"]}>
        <h1 className={styles.roominfo}>
          Room: {roomCode}, User: {userName}
        </h1>
        <button className={styles.leavebutton} onClick={onLeaveRoom}>
          Leave
        </button>
      </div>

      {/* Message Div */}
      <div className={styles.messagebox}>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`${styles.message} ${msg.user === "System" ? styles.systemmessage : ""}`}
          >
            <span className={styles["msgdiv-username"]}>{msg.user}:</span>{" "}
            {msg.message}
          </div>
        ))}
        <div ref={messageEndRef}></div>
      </div>

      <form
        onSubmit={handleSendMessage}
        className={styles["send-message-form"]}
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type message..."
          className={styles["send-message-form-box"]}
        />
        <button type="submit" className={styles.sendbutton}>
          Send
        </button>
      </form>
    </div>
  );
}
