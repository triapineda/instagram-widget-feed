// api/posts.js — ultra-simple: no Published filter, shows anything with an Image
import { Client } from "@notionhq/client";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!token || !databaseId) {
    return res.status(500).json({ error: "Missing NOTION_TOKEN or NOTION_DATABASE_ID" });
  }

  const notion = new Client({ auth: token });

  try {
    const query = await notion.databases.query({
      database_id: databaseId,
      sorts: [{ property: "Order", direction: "ascending" }]
    });

    const posts = query.results.map(page => {
      const props = page.properties;

      // Name (Title) optional
      let title = "";
      if (props["Name"]?.title?.length) {
        title = props["Name"].title.map(t => t.plain_text).join("").trim();
      }

      // Image: URL or Files & media
      let image = props["Image"]?.url || "";
      if (!image && props["Image"]?.files?.length) {
        const f = props["Image"].files[0];
        image = f?.external?.url || f?.file?.url || "";
      }

      const link = props["Link"]?.url || "";

      return { image, link, title };
    }).filter(p => p.image);

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      username: process.env.USERNAME || "simplyclad.co",
      profileUrl: process.env.PROFILE_URL || "https://www.instagram.com/simplyclad.co/",
      avatar: process.env.AVATAR_URL || "",
      posts
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to query Notion", details: err?.message });
  }
}
