const IDENTITY_POOL = [
  { name: "Panda", avatar: "🐼" },
  { name: "Fox", avatar: "🦊" },
  { name: "Koala", avatar: "🐨" },
  { name: "Tiger", avatar: "🐯" },
  { name: "Penguin", avatar: "🐧" },
  { name: "Dolphin", avatar: "🐬" },
  { name: "Otter", avatar: "🦦" },
  { name: "Turtle", avatar: "🐢" },
  { name: "Seal", avatar: "🦭" },
  { name: "Rabbit", avatar: "🐰" },
  { name: "Apple", avatar: "🍎" },
  { name: "Banana", avatar: "🍌" },
  { name: "Cherry", avatar: "🍒" },
  { name: "Grape", avatar: "🍇" },
  { name: "Peach", avatar: "🍑" },
  { name: "Pear", avatar: "🍐" },
  { name: "Lemon", avatar: "🍋" },
  { name: "Orange", avatar: "🍊" },
  { name: "Melon", avatar: "🍈" },
  { name: "Kiwi", avatar: "🥝" },
  { name: "Mango", avatar: "🥭" },
  { name: "Coconut", avatar: "🥥" },
  { name: "Avocado", avatar: "🥑" },
  { name: "Blueberry", avatar: "🫐" },
];

export function generatePlayerIdentity(existingNames: Set<string>) {
  const availableIdentities = IDENTITY_POOL.filter(
    (identity) => !existingNames.has(identity.name),
  );

  const source =
    availableIdentities.length > 0 ? availableIdentities : IDENTITY_POOL;

  return source[Math.floor(Math.random() * source.length)];
}
