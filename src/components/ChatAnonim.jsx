import React, { useState, useEffect, useRef } from "react";
import { addDoc, collection, query, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import axios from "axios";
import Swal from "sweetalert2";
import { containsProfanity } from "../utils/profanityFilter";

function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [userIp, setUserIp] = useState("");
  const [messageCount, setMessageCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const SEND_COOLDOWN_MS = 3000;

  const chatsCollectionRef = collection(db, "chats");
  const messagesEndRef = useRef(null);

  // Fungsi untuk mengambil daftar alamat IP yang diblokir dari Firebase Firestore
  const fetchBlockedIPs = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "blacklist_ips"));
      const blockedIPs = querySnapshot.docs.map((doc) => doc.data().ipAddress);
      return blockedIPs;
    } catch (error) {
      console.error("Gagal mengambil daftar IP yang diblokir:", error);
      return [];
    }
  }

  useEffect(() => {
    // Memuat pesan dari Firestore dan mengatur langganan untuk memantau perubahan
    const queryChats = query(chatsCollectionRef, orderBy("timestamp"));
    const unsubscribe = onSnapshot(queryChats, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          userIp: data.userIp,
        };
      });
      setMessages(newMessages);
      setIsLoadingChat(false);
      if (shouldScrollToBottom) {
        scrollToBottom();
      }
    }, (error) => {
      console.error("Gagal memuat pesan:", error);
      setIsLoadingChat(false);
    });

    return () => {
      unsubscribe(); // Membersihkan langganan saat komponen tidak lagi digunakan
    }
  }, [shouldScrollToBottom]);

  useEffect(() => {
    // Mengambil alamat IP pengguna dan memeriksa batasan pesan
    getUserIp();
    checkMessageCount();
    scrollToBottom();
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, 100);
  }

  const getUserIp = async () => {
    try {
      // Cek apakah alamat IP sudah disimpan di localStorage
      const cachedIp = localStorage.getItem("userIp");
      if (cachedIp) {
        setUserIp(cachedIp);
        return;
      }
      // Jika tidak ada di localStorage, ambil alamat IP dari API eksternal
      const response = await axios.get("https://ipapi.co/json");
      const newUserIp = response.data.network;
      setUserIp(newUserIp);
      // Simpan alamat IP dalam localStorage dengan waktu kedaluwarsa (misalnya, 1 jam)
      const expirationTime = new Date().getTime() + 60 * 60 * 1000; // 1 jam
      localStorage.setItem("userIp", newUserIp);
      localStorage.setItem("ipExpiration", expirationTime.toString());
    } catch (error) {
      console.error("Gagal mendapatkan alamat IP:", error);
    }
  };

  const checkMessageCount = () => {
    const userIpAddress = userIp;
    const currentDate = new Date();
    const currentDateString = currentDate.toDateString();
    const storedDateString = localStorage.getItem("messageCountDate");

    if (currentDateString === storedDateString) {
      // Jika tanggal saat ini sama dengan tanggal yang disimpan, periksa batasan pesan
      const userSentMessageCount = parseInt(localStorage.getItem(userIpAddress)) || 0;
      if (userSentMessageCount >= 20) { // Batasan pesan per hari (2 pesan)
        Swal.fire({
          icon: "error",
          title: "Message limit exceeded",
          text: "You have reached your daily message limit.",
          customClass: {
            container: "sweet-alert-container",
          },
        });
      } else {
        setMessageCount(userSentMessageCount);
      }
    } else {
      // Jika tanggal berbeda, bersihkan data penghitungan pesan sebelumnya
      localStorage.removeItem(userIpAddress);
      localStorage.setItem("messageCountDate", currentDateString);
    }
  };

  // Fungsi untuk memeriksa apakah alamat IP pengguna ada dalam daftar hitam
  const isIpBlocked = async () => {
    const blockedIPs = await fetchBlockedIPs();
    return blockedIPs.includes(userIp);
  };

  const sendMessage = async () => {
    if (isSending) return;
    if (message.trim() !== "") {
      if (containsProfanity(message)) {
        Swal.fire({
          icon: "warning",
          title: "Pesan tidak dapat dikirim",
          text: "Pesan Anda mengandung kata-kata tidak pantas.",
          customClass: {
            container: "sweet-alert-container",
          },
        });
        return;
      }

      // Memanggil isIpBlocked untuk memeriksa apakah pengguna diblokir
      const isBlocked = await isIpBlocked();

      if (isBlocked) {
        Swal.fire({
          icon: "error",
          title: "Blocked",
          text: "You are blocked from sending messages.",
          customClass: {
            container: "sweet-alert-container",
          },
        });
        return;
      }

      const senderImageURL = auth.currentUser?.photoURL || "/AnonimUser.png";
      const trimmedMessage = message.trim().substring(0, 60);
      const userIpAddress = userIp;

      if (messageCount >= 20) { // Batasan pesan per hari (20 pesan)
        Swal.fire({
          icon: "error",
          title: "Message limit exceeded",
          text: "You have reached your daily message limit.",
          customClass: {
            container: "sweet-alert-container",
          },
        });
        return;
      }

      const updatedSentMessageCount = messageCount + 1;
      localStorage.setItem(userIpAddress, updatedSentMessageCount.toString());
      setMessageCount(updatedSentMessageCount);

      setIsSending(true);
      try {
        // Menambahkan pesan ke Firestore
        await addDoc(chatsCollectionRef, {
          message: trimmedMessage,
          sender: {
            image: senderImageURL,
          },
          timestamp: new Date(),
          userIp: userIp,
        });

        setMessage(""); // Menghapus pesan setelah mengirim
        setTimeout(() => {
          setShouldScrollToBottom(true);
        }, 100);
      } finally {
        setTimeout(() => setIsSending(false), SEND_COOLDOWN_MS);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="" id="ChatAnonim">
      <div className="text-center text-4xl font-semibold" id="Glow">
        Text Anonim
      </div>

      <div className="mt-5" id="KotakPesan" style={{ overflowY: "auto" }}>
        {isLoadingChat
          ? [0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center text-sm py-[1%]">
                <div className="Skeleton h-7 w-7 mr-2 rounded-full shrink-0"></div>
                <div
                  className="Skeleton h-4"
                  style={{ width: `${55 + ((i * 13) % 35)}%` }}></div>
              </div>
            ))
          : messages.map((msg, index) => (
              <div key={index} className="flex items-start text-sm py-[1%]">
                <img src={msg.sender.image} alt="User Profile" className="h-7 w-7 mr-2 " />
                <div className="relative top-[0.30rem]">{msg.message}</div>
              </div>
            ))}
        <div ref={messagesEndRef}></div>
      </div>
      <div id="InputChat" className="flex items-center mt-5">
        <input
          className="bg-transparent flex-grow pr-4 w-4 placeholder:text-white placeholder:opacity-60 disabled:opacity-40"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ketik pesan Anda..."
          maxLength={60}
          disabled={isSending}
        />
        <button onClick={sendMessage} className="ml-2 disabled:opacity-40" disabled={isSending}>
          <img src="/paper-plane.png" alt="" className="h-4 w-4 lg:h-6 lg:w-6" />
        </button>
      </div>
    </div>
  );
}

export default Chat;
