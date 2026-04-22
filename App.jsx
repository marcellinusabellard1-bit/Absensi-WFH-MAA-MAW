import { useState, useEffect } from "react";

const STORAGE_KEY = "wfh_absensi_data";
const EMPLOYEES_KEY = "wfh_employees_data";
const SESSION_KEY = "wfh_session";

const DEFAULT_EMPLOYEES = [
  { id: "EMP001", name: "Marserio", department: "Engineering", pin: "1234" },
  { id: "EMP002", name: "Russell Rene", department: "Marketing", pin: "2345" },
  { id: "EMP003", name: "Marseille", department: "Finance", pin: "3456" },
  { id: "EMP004", name: "Axelle", department: "HR", pin: "4567" },
];

const ADMIN_PIN = "0000";

const getTodayStr = () => new Date().toISOString().split("T")[0];
const getNow = () => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const formatDate = (d) => new Date(d).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const formatTime = (t) => t || "-";

const isLate = (clockIn) => {
  if (!clockIn) return false;
  const [h, m] = clockIn.split(":").map(Number);
  return h > 9 || (h === 9 && m > 0);
};

const statusBadge = (record) => {
  if (!record) return { label: "Tidak Hadir", color: "#ef4444", bg: "#fef2f2" };
  if (!record.clockIn) return { label: "Tidak Hadir", color: "#ef4444", bg: "#fef2f2" };
  if (isLate(record.clockIn)) return { label: "Terlambat", color: "#f59e0b", bg: "#fffbeb" };
  return { label: "Hadir", color: "#10b981", bg: "#ecfdf5" };
};

export default function AbsensiWFH() {
  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem(EMPLOYEES_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_EMPLOYEES;
  });
  const [attendance, setAttendance] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  });
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [view, setView] = useState("login"); // login | employee | admin
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [clockedIn, setClockedIn] = useState(false);
  const [liveTime, setLiveTime] = useState(getNow());
  const [adminTab, setAdminTab] = useState("rekap");
  const [newEmp, setNewEmp] = useState({ id: "", name: "", department: "", pin: "" });
  const [notification, setNotification] = useState(null);
  const [filterDate, setFilterDate] = useState(getTodayStr());
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loginMode, setLoginMode] = useState("employee"); // employee | admin

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(getNow()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }, [session]);

  useEffect(() => {
    if (session && view === "employee") {
      const today = getTodayStr();
      const rec = attendance[today]?.[session.id];
      setClockedIn(!!rec?.clockIn);
    }
  }, [session, attendance, view]);

  const showNotif = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogin = () => {
    if (loginMode === "admin") {
      if (pinInput === ADMIN_PIN) {
        setSession({ role: "admin" });
        setView("admin");
        setPinInput("");
        setPinError("");
      } else {
        setPinError("PIN Admin salah!");
        setPinInput("");
      }
      return;
    }
    const emp = employees.find((e) => e.pin === pinInput);
    if (emp) {
      setSession({ role: "employee", ...emp });
      setView("employee");
      setPinInput("");
      setPinError("");
    } else {
      setPinError("PIN tidak ditemukan. Coba lagi!");
      setPinInput("");
    }
  };

  const handlePinKey = (val) => {
    if (val === "DEL") { setPinInput((p) => p.slice(0, -1)); return; }
    if (pinInput.length < 6) setPinInput((p) => p + val);
  };

  const handleClockIn = () => {
    const today = getTodayStr();
    const now = getNow();
    setAttendance((prev) => ({
      ...prev,
      [today]: {
        ...prev[today],
        [session.id]: { ...prev[today]?.[session.id], clockIn: now, name: session.name, department: session.department },
      },
    }));
    setClockedIn(true);
    showNotif(`✅ Clock In berhasil pada ${now}`);
  };

  const handleClockOut = () => {
    const today = getTodayStr();
    const now = getNow();
    setAttendance((prev) => ({
      ...prev,
      [today]: {
        ...prev[today],
        [session.id]: { ...prev[today]?.[session.id], clockOut: now },
      },
    }));
    showNotif(`👋 Clock Out berhasil pada ${now}`);
  };

  const handleLogout = () => {
    setSession(null);
    setView("login");
    setPinInput("");
    setPinError("");
  };

  const addEmployee = () => {
    if (!newEmp.id || !newEmp.name || !newEmp.department || !newEmp.pin) {
      showNotif("Semua field wajib diisi!", "error"); return;
    }
    if (employees.find((e) => e.id === newEmp.id)) {
      showNotif("ID Karyawan sudah ada!", "error"); return;
    }
    setEmployees((prev) => [...prev, newEmp]);
    setNewEmp({ id: "", name: "", department: "", pin: "" });
    setShowAddForm(false);
    showNotif("✅ Karyawan berhasil ditambahkan!");
  };

  const deleteEmployee = (id) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    showNotif("Karyawan dihapus.");
  };

  const getTodayRecord = (empId) => attendance[getTodayStr()]?.[empId];
  const getEmpRecord = (empId, date) => attendance[date]?.[empId];

  const allDates = [...new Set(Object.keys(attendance))].sort((a, b) => b.localeCompare(a));
  const empHistory = selectedEmpId
    ? allDates.map((d) => ({ date: d, rec: attendance[d]?.[selectedEmpId] })).filter((x) => x.rec)
    : [];

  // ─── STYLES ───────────────────────────────────────────────
  const S = {
    app: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      fontFamily: "'DM Sans', sans-serif",
      color: "#e2e8f0",
      position: "relative",
      overflow: "hidden",
    },
    glow: {
      position: "fixed", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none", zIndex: 0,
    },
    card: {
      background: "rgba(30, 41, 59, 0.8)",
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(99, 102, 241, 0.2)",
      borderRadius: "20px",
      padding: "32px",
      position: "relative",
      zIndex: 1,
    },
    btn: (color = "#6366f1") => ({
      background: color,
      color: "#fff",
      border: "none",
      borderRadius: "12px",
      padding: "12px 24px",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "15px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s",
    }),
    input: {
      background: "rgba(15, 23, 42, 0.6)",
      border: "1px solid rgba(99, 102, 241, 0.3)",
      borderRadius: "10px",
      padding: "10px 14px",
      color: "#e2e8f0",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "14px",
      width: "100%",
      outline: "none",
    },
  };

  // ─── NOTIFICATION ──────────────────────────────────────────
  const Notif = () => notification ? (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999,
      background: notification.type === "error" ? "#ef4444" : "#10b981",
      color: "#fff", padding: "14px 22px", borderRadius: "14px",
      fontWeight: "600", fontSize: "14px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      animation: "slideIn 0.3s ease",
    }}>
      {notification.msg}
    </div>
  ) : null;

  // ─── PIN PAD ───────────────────────────────────────────────
  const PinPad = () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", maxWidth: "240px", margin: "0 auto" }}>
      {["1","2","3","4","5","6","7","8","9","","0","DEL"].map((k, i) => (
        <button key={i} onClick={() => k && handlePinKey(k)} style={{
          ...S.btn(k === "DEL" ? "#475569" : k === "" ? "transparent" : "rgba(99,102,241,0.2)"),
          padding: "16px", fontSize: "18px", fontWeight: "700",
          border: k === "" ? "none" : "1px solid rgba(99,102,241,0.3)",
          borderRadius: "12px", cursor: k === "" ? "default" : "pointer",
          color: k === "DEL" ? "#94a3b8" : "#e2e8f0",
        }}>{k === "DEL" ? "⌫" : k}</button>
      ))}
    </div>
  );

  // ─── LOGIN VIEW ────────────────────────────────────────────
  if (view === "login") return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet" />
      <style>{`@keyframes slideIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
      <div style={{ ...S.glow, width: 400, height: 400, top: -100, left: -100, background: "rgba(99,102,241,0.15)" }} />
      <div style={{ ...S.glow, width: 300, height: 300, bottom: -50, right: -50, background: "rgba(16,185,129,0.1)" }} />
      <Notif />

      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative", zIndex: 1 }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ width: 72, height: 72, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "32px" }}>🏠</div>
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "28px", margin: 0, background: "linear-gradient(135deg,#818cf8,#c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>WFH Attendance</h1>
            <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: "14px" }}>{formatDate(getTodayStr())}</p>
            <p style={{ color: "#818cf8", margin: "4px 0 0", fontSize: "22px", fontWeight: "700", letterSpacing: "2px" }}>{liveTime}</p>
          </div>

          <div style={S.card}>
            {/* Mode Toggle */}
            <div style={{ display: "flex", background: "rgba(15,23,42,0.6)", borderRadius: "12px", padding: "4px", marginBottom: "24px" }}>
              {["employee","admin"].map((m) => (
                <button key={m} onClick={() => { setLoginMode(m); setPinInput(""); setPinError(""); }} style={{
                  flex: 1, padding: "10px", border: "none", borderRadius: "10px", cursor: "pointer",
                  fontFamily: "'DM Sans',sans-serif", fontWeight: "600", fontSize: "14px", transition: "all 0.2s",
                  background: loginMode === m ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent",
                  color: loginMode === m ? "#fff" : "#64748b",
                }}>
                  {m === "employee" ? "👤 Karyawan" : "🔑 Admin"}
                </button>
              ))}
            </div>

            <p style={{ color: "#94a3b8", fontSize: "13px", textAlign: "center", marginBottom: "16px" }}>
              {loginMode === "employee" ? "Masukkan PIN karyawan Anda" : "Masukkan PIN Admin (0000)"}
            </p>

            {/* PIN Display */}
            <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "20px" }}>
              {[0,1,2,3,4,5].map((i) => (
                <div key={i} style={{
                  width: 14, height: 14, borderRadius: "50%", transition: "all 0.2s",
                  background: i < pinInput.length ? "#6366f1" : "rgba(99,102,241,0.2)",
                  border: "2px solid " + (i < pinInput.length ? "#6366f1" : "rgba(99,102,241,0.3)"),
                  transform: i < pinInput.length ? "scale(1.2)" : "scale(1)",
                }} />
              ))}
            </div>

            <PinPad />

            {pinError && <p style={{ color: "#ef4444", textAlign: "center", fontSize: "13px", marginTop: "12px" }}>{pinError}</p>}

            <button onClick={handleLogin} disabled={pinInput.length < 4} style={{
              ...S.btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),
              width: "100%", marginTop: "20px", padding: "14px",
              fontSize: "16px", opacity: pinInput.length < 4 ? 0.5 : 1,
            }}>
              Masuk →
            </button>
          </div>
          <p style={{ textAlign: "center", color: "#475569", fontSize: "12px", marginTop: "16px" }}>
            Demo PIN karyawan: 1234, 2345, 3456, 4567 | Admin: 0000
          </p>
        </div>
      </div>
    </div>
  );

  // ─── EMPLOYEE VIEW ─────────────────────────────────────────
  if (view === "employee") {
    const today = getTodayStr();
    const rec = getTodayRecord(session.id);
    const status = statusBadge(rec);

    const myHistory = allDates.map((d) => ({
      date: d,
      rec: attendance[d]?.[session.id],
    })).filter((x) => x.rec);

    return (
      <div style={S.app}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet" />
        <style>{`@keyframes slideIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}`}</style>
        <div style={{ ...S.glow, width: 400, height: 400, top: -100, right: -100, background: "rgba(99,102,241,0.12)" }} />
        <Notif />

        <div style={{ maxWidth: "480px", margin: "0 auto", padding: "24px", position: "relative", zIndex: 1 }}>
          {/* Top bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div>
              <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>Selamat datang 👋</p>
              <h2 style={{ margin: "2px 0 0", fontFamily: "'Space Grotesk',sans-serif", fontSize: "20px", color: "#e2e8f0" }}>{session.name}</h2>
              <p style={{ margin: "2px 0 0", color: "#818cf8", fontSize: "13px" }}>{session.department} · {session.id}</p>
            </div>
            <button onClick={handleLogout} style={{ ...S.btn("#334155"), padding: "8px 16px", fontSize: "13px" }}>Keluar</button>
          </div>

          {/* Clock Widget */}
          <div style={{ ...S.card, textAlign: "center", marginBottom: "20px", background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))" }}>
            <p style={{ color: "#64748b", fontSize: "13px", margin: "0 0 4px" }}>{formatDate(today)}</p>
            <div style={{ fontSize: "48px", fontFamily: "'Space Grotesk',sans-serif", fontWeight: "700", color: "#e2e8f0", letterSpacing: "2px", margin: "8px 0" }}>{liveTime}</div>
            <div style={{ display: "inline-block", background: status.bg, color: status.color, padding: "4px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>
              {status.label}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              {[["Clock In", rec?.clockIn], ["Clock Out", rec?.clockOut]].map(([label, val]) => (
                <div key={label} style={{ background: "rgba(15,23,42,0.5)", borderRadius: "12px", padding: "14px" }}>
                  <p style={{ color: "#64748b", fontSize: "12px", margin: "0 0 4px" }}>{label}</p>
                  <p style={{ color: val ? "#10b981" : "#475569", fontSize: "20px", fontWeight: "700", margin: 0, fontFamily: "'Space Grotesk',sans-serif" }}>{formatTime(val)}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={handleClockIn} disabled={!!rec?.clockIn} style={{
                ...S.btn("linear-gradient(135deg,#10b981,#059669)"), flex: 1, padding: "14px",
                opacity: rec?.clockIn ? 0.4 : 1, cursor: rec?.clockIn ? "not-allowed" : "pointer",
              }}>✅ Clock In</button>
              <button onClick={handleClockOut} disabled={!rec?.clockIn || !!rec?.clockOut} style={{
                ...S.btn("linear-gradient(135deg,#f59e0b,#d97706)"), flex: 1, padding: "14px",
                opacity: (!rec?.clockIn || !!rec?.clockOut) ? 0.4 : 1,
                cursor: (!rec?.clockIn || !!rec?.clockOut) ? "not-allowed" : "pointer",
              }}>👋 Clock Out</button>
            </div>
          </div>

          {/* History */}
          <div style={S.card}>
            <h3 style={{ margin: "0 0 16px", fontFamily: "'Space Grotesk',sans-serif", fontSize: "16px", color: "#c4b5fd" }}>📋 Riwayat Absensi</h3>
            {myHistory.length === 0 ? (
              <p style={{ color: "#475569", textAlign: "center", fontSize: "14px" }}>Belum ada riwayat absensi.</p>
            ) : myHistory.map(({ date, rec }) => {
              const s = statusBadge(rec);
              return (
                <div key={date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(99,102,241,0.1)" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#e2e8f0" }}>{new Date(date).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>In: {formatTime(rec?.clockIn)} · Out: {formatTime(rec?.clockOut)}</p>
                  </div>
                  <span style={{ background: s.bg, color: s.color, padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── ADMIN VIEW ────────────────────────────────────────────
  if (view === "admin") {
    const todayRecs = attendance[filterDate] || {};
    const rekapData = employees.map((emp) => {
      const rec = todayRecs[emp.id];
      const s = statusBadge(rec);
      return { ...emp, rec, status: s };
    });

    const stats = {
      hadir: rekapData.filter((e) => e.status.label === "Hadir").length,
      terlambat: rekapData.filter((e) => e.status.label === "Terlambat").length,
      tidak: rekapData.filter((e) => e.status.label === "Tidak Hadir").length,
    };

    return (
      <div style={S.app}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet" />
        <style>{`@keyframes slideIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
        <div style={{ ...S.glow, width: 500, height: 500, top: -150, left: -150, background: "rgba(99,102,241,0.1)" }} />
        <Notif />

        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "24px", position: "relative", zIndex: 1 }}>
          {/* Top bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div>
              <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>Panel Admin 🔑</p>
              <h2 style={{ margin: "2px 0 0", fontFamily: "'Space Grotesk',sans-serif", fontSize: "22px", background: "linear-gradient(135deg,#818cf8,#c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>WFH Dashboard</h2>
            </div>
            <button onClick={handleLogout} style={{ ...S.btn("#334155"), padding: "8px 16px", fontSize: "13px" }}>Keluar</button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            {[["rekap","📊 Rekap Harian"],["karyawan","👥 Karyawan"],["detail","📋 Detail Karyawan"]].map(([tab, label]) => (
              <button key={tab} onClick={() => setAdminTab(tab)} style={{
                ...S.btn(adminTab === tab ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(30,41,59,0.8)"),
                border: "1px solid rgba(99,102,241,0.3)", fontSize: "13px", padding: "10px 18px",
              }}>{label}</button>
            ))}
          </div>

          {/* REKAP TAB */}
          {adminTab === "rekap" && (
            <>
              <div style={{ display: "flex", gap: "12px", marginBottom: "20px", alignItems: "center" }}>
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                  style={{ ...S.input, width: "auto", padding: "10px 14px" }} />
                <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>{formatDate(filterDate)}</p>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "20px" }}>
                {[["✅ Hadir", stats.hadir, "#10b981"], ["⚠️ Terlambat", stats.terlambat, "#f59e0b"], ["❌ Tidak Hadir", stats.tidak, "#ef4444"]].map(([label, val, color]) => (
                  <div key={label} style={{ ...S.card, padding: "20px", textAlign: "center" }}>
                    <p style={{ color: "#64748b", fontSize: "12px", margin: "0 0 6px" }}>{label}</p>
                    <p style={{ color, fontSize: "36px", fontWeight: "700", margin: 0, fontFamily: "'Space Grotesk',sans-serif" }}>{val}</p>
                  </div>
                ))}
              </div>

              <div style={S.card}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(99,102,241,0.2)" }}>
                      {["Karyawan","Departemen","Clock In","Clock Out","Status"].map((h) => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rekapData.map((emp) => (
                      <tr key={emp.id} style={{ borderBottom: "1px solid rgba(99,102,241,0.08)" }}>
                        <td style={{ padding: "12px", fontSize: "14px", fontWeight: "600", color: "#e2e8f0" }}>{emp.name}</td>
                        <td style={{ padding: "12px", fontSize: "13px", color: "#94a3b8" }}>{emp.department}</td>
                        <td style={{ padding: "12px", fontSize: "14px", color: emp.rec?.clockIn ? "#10b981" : "#475569", fontFamily: "'Space Grotesk',sans-serif" }}>{formatTime(emp.rec?.clockIn)}</td>
                        <td style={{ padding: "12px", fontSize: "14px", color: emp.rec?.clockOut ? "#f59e0b" : "#475569", fontFamily: "'Space Grotesk',sans-serif" }}>{formatTime(emp.rec?.clockOut)}</td>
                        <td style={{ padding: "12px" }}>
                          <span style={{ background: emp.status.bg, color: emp.status.color, padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>{emp.status.label}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* KARYAWAN TAB */}
          {adminTab === "karyawan" && (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
                <button onClick={() => setShowAddForm((v) => !v)} style={{ ...S.btn("linear-gradient(135deg,#10b981,#059669)") }}>
                  {showAddForm ? "✕ Tutup" : "+ Tambah Karyawan"}
                </button>
              </div>

              {showAddForm && (
                <div style={{ ...S.card, marginBottom: "16px" }}>
                  <h3 style={{ margin: "0 0 16px", fontFamily: "'Space Grotesk',sans-serif", fontSize: "16px", color: "#10b981" }}>Tambah Karyawan Baru</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                    {[["ID Karyawan","id"],["Nama Lengkap","name"],["Departemen","department"],["PIN (4-6 digit)","pin"]].map(([label, field]) => (
                      <div key={field}>
                        <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 6px" }}>{label}</p>
                        <input value={newEmp[field]} onChange={(e) => setNewEmp((p) => ({ ...p, [field]: e.target.value }))}
                          placeholder={label} style={S.input} type={field === "pin" ? "password" : "text"} />
                      </div>
                    ))}
                  </div>
                  <button onClick={addEmployee} style={{ ...S.btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), width: "100%", padding: "12px" }}>
                    Simpan Karyawan
                  </button>
                </div>
              )}

              <div style={S.card}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(99,102,241,0.2)" }}>
                      {["ID","Nama","Departemen","Aksi"].map((h) => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.id} style={{ borderBottom: "1px solid rgba(99,102,241,0.08)" }}>
                        <td style={{ padding: "12px", fontSize: "13px", color: "#818cf8", fontFamily: "'Space Grotesk',sans-serif" }}>{emp.id}</td>
                        <td style={{ padding: "12px", fontSize: "14px", fontWeight: "600", color: "#e2e8f0" }}>{emp.name}</td>
                        <td style={{ padding: "12px", fontSize: "13px", color: "#94a3b8" }}>{emp.department}</td>
                        <td style={{ padding: "12px" }}>
                          <button onClick={() => deleteEmployee(emp.id)} style={{ ...S.btn("#ef4444"), padding: "6px 14px", fontSize: "12px" }}>Hapus</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* DETAIL TAB */}
          {adminTab === "detail" && (
            <>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
                {employees.map((emp) => (
                  <button key={emp.id} onClick={() => setSelectedEmpId(emp.id)} style={{
                    ...S.btn(selectedEmpId === emp.id ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(30,41,59,0.8)"),
                    border: "1px solid rgba(99,102,241,0.3)", fontSize: "13px", padding: "8px 16px",
                  }}>{emp.name}</button>
                ))}
              </div>

              {selectedEmpId && (
                <div style={S.card}>
                  <h3 style={{ margin: "0 0 16px", fontFamily: "'Space Grotesk',sans-serif", fontSize: "16px", color: "#c4b5fd" }}>
                    Riwayat: {employees.find((e) => e.id === selectedEmpId)?.name}
                  </h3>
                  {empHistory.length === 0 ? (
                    <p style={{ color: "#475569", textAlign: "center", fontSize: "14px" }}>Belum ada data absensi.</p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(99,102,241,0.2)" }}>
                          {["Tanggal","Clock In","Clock Out","Status"].map((h) => (
                            <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {empHistory.map(({ date, rec }) => {
                          const s = statusBadge(rec);
                          return (
                            <tr key={date} style={{ borderBottom: "1px solid rgba(99,102,241,0.08)" }}>
                              <td style={{ padding: "12px", fontSize: "14px", color: "#e2e8f0" }}>{new Date(date).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</td>
                              <td style={{ padding: "12px", fontSize: "14px", color: "#10b981", fontFamily: "'Space Grotesk',sans-serif" }}>{formatTime(rec?.clockIn)}</td>
                              <td style={{ padding: "12px", fontSize: "14px", color: "#f59e0b", fontFamily: "'Space Grotesk',sans-serif" }}>{formatTime(rec?.clockOut)}</td>
                              <td style={{ padding: "12px" }}>
                                <span style={{ background: s.bg, color: s.color, padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>{s.label}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
}
