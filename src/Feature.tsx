import { useEffect, useState } from "react";
import {
  MeshNameInput,
  PersonalQR,
  makeScanPayload,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };
type Reply = {
  name: string;
  status: "yes" | "no" | "maybe";
  plusOnes: number;
  dietary: string;
};
const NAME_KEY = (p: string) => `${p}:displayName`;

export function Feature({ room, config }: Props) {
  if (!room) {
    return (
      <div className="viral-screen">
        <h1>rsvp</h1>
        <p className="viral-status">Connecting…</p>
      </div>
    );
  }
  return <Body room={room} config={config} />;
}

function Body({ room, config }: { room: YRoom; config: MeshConfig }) {
  const [name, setName] = useState(
    () => localStorage.getItem(NAME_KEY(config.storagePrefix)) ?? "",
  );
  const [plusOnes, setPlusOnes] = useState("0");
  const [dietary, setDietary] = useState("");
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [whenDraft, setWhenDraft] = useState("");
  const [whereDraft, setWhereDraft] = useState("");
  const [, rerender] = useState(0);

  useEffect(() => {
    if (name) localStorage.setItem(NAME_KEY(config.storagePrefix), name);
  }, [name, config.storagePrefix]);

  useEffect(() => {
    const rs = room.doc.getMap<Reply>("replies");
    const meta = room.doc.getMap<string>("meta");
    const cb = () => rerender((n) => n + 1);
    rs.observe(cb);
    meta.observe(cb);
    return () => {
      rs.unobserve(cb);
      meta.unobserve(cb);
    };
  }, [room]);

  const replies = room.doc.getMap<Reply>("replies");
  const meta = room.doc.getMap<string>("meta");
  const title = meta.get("title") ?? "";
  const when = meta.get("when") ?? "";
  const where = meta.get("where") ?? "";

  const reply = (status: Reply["status"]) => {
    if (!name.trim()) return;
    const po = Math.max(0, parseInt(plusOnes, 10) || 0);
    replies.set(room.peerId, { name: name.trim(), status, plusOnes: po, dietary: dietary.trim() });
  };

  const saveMeta = () => {
    room.doc.transact(() => {
      meta.set("title", titleDraft.trim());
      meta.set("when", whenDraft.trim());
      meta.set("where", whereDraft.trim());
    });
    setEditing(false);
  };

  const replyList: Array<Reply & { peerId: string }> = [];
  replies.forEach((r, k) => replyList.push({ ...r, peerId: k }));
  const yes = replyList.filter((r) => r.status === "yes");
  const maybe = replyList.filter((r) => r.status === "maybe");
  const no = replyList.filter((r) => r.status === "no");
  const totalAttending = yes.reduce((s, r) => s + 1 + r.plusOnes, 0);
  const dietaryCount = new Map<string, number>();
  replyList
    .filter((r) => r.status === "yes" && r.dietary)
    .forEach((r) => {
      const tags = r.dietary
        .split(/[,;]/)
        .map((t) => t.trim())
        .filter(Boolean);
      tags.forEach((t) => dietaryCount.set(t, (dietaryCount.get(t) ?? 0) + 1));
    });

  const mine = replies.get(room.peerId);
  const inviteQR = makeScanPayload(room.roomId, "INVITE", title);

  return (
    <div className="viral-screen">
      <header>
        <h1>rsvp</h1>
        <p className="viral-status">
          <strong>{totalAttending}</strong> attending · {yes.length} yes · {maybe.length} maybe ·{" "}
          {no.length} no
        </p>
      </header>

      <section>
        {editing ? (
          <form
            className="rsvp-edit"
            onSubmit={(e) => {
              e.preventDefault();
              saveMeta();
            }}
          >
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              placeholder="event title"
              className="viral-name"
            />
            <input
              value={whenDraft}
              onChange={(e) => setWhenDraft(e.target.value)}
              placeholder="when (e.g. Sat 2026-06-12 18:00)"
              className="viral-name"
            />
            <input
              value={whereDraft}
              onChange={(e) => setWhereDraft(e.target.value)}
              placeholder="where"
              className="viral-name"
            />
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button type="submit" className="viral-primary">
                save
              </button>
              <button type="button" className="viral-ghost" onClick={() => setEditing(false)}>
                cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="rsvp-display"
            onClick={() => {
              setTitleDraft(title);
              setWhenDraft(when);
              setWhereDraft(where);
              setEditing(true);
            }}
          >
            <strong>{title || "untitled event (tap to edit)"}</strong>
            {when && <p>📅 {when}</p>}
            {where && <p>📍 {where}</p>}
          </button>
        )}
      </section>

      <section>
        <h2 className="viral-section-title">share invite</h2>
        <PersonalQR payload={inviteQR} size={180} />
      </section>

      <section>
        <h2 className="viral-section-title">your reply</h2>
        <MeshNameInput
          className="viral-name"
          value={name}
          onChange={setName}
          placeholder="your name"
          maxLength={48}
        />
        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.3rem", flexWrap: "wrap" }}>
          <input
            type="number"
            min="0"
            value={plusOnes}
            onChange={(e) => setPlusOnes(e.target.value)}
            placeholder="+1s"
            style={{ width: "5rem" }}
            className="viral-name"
          />
          <input
            value={dietary}
            onChange={(e) => setDietary(e.target.value)}
            placeholder="dietary (e.g. vegetarian, no nuts)"
            className="viral-name"
            style={{ flex: 1 }}
          />
        </div>
        <div className="rsvp-buttons">
          <button
            type="button"
            className={mine?.status === "yes" ? "viral-primary" : "viral-ghost"}
            onClick={() => reply("yes")}
            disabled={!name.trim()}
          >
            ✓ going
          </button>
          <button
            type="button"
            className={mine?.status === "maybe" ? "viral-primary" : "viral-ghost"}
            onClick={() => reply("maybe")}
            disabled={!name.trim()}
          >
            ~ maybe
          </button>
          <button
            type="button"
            className={mine?.status === "no" ? "viral-primary" : "viral-ghost"}
            onClick={() => reply("no")}
            disabled={!name.trim()}
          >
            ✗ no
          </button>
        </div>
      </section>

      <section>
        <h2 className="viral-section-title">attending ({totalAttending})</h2>
        {yes.length === 0 ? (
          <p className="viral-empty">nobody yet</p>
        ) : (
          <ul className="rsvp-list">
            {yes.map((r) => (
              <li key={r.peerId} className={r.peerId === room.peerId ? "is-me" : ""}>
                <strong>{r.name}</strong>
                {r.plusOnes > 0 && <span> +{r.plusOnes}</span>}
                {r.dietary && <em> · {r.dietary}</em>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {dietaryCount.size > 0 && (
        <section>
          <h2 className="viral-section-title">dietary breakdown</h2>
          <ul className="viral-tags">
            {Array.from(dietaryCount.entries()).map(([tag, n]) => (
              <li key={tag}>
                <strong>{tag}</strong>: {n}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
