import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleActivityStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleActivityStatistics";

export async function getDiscussionBoardStatisticsArticleActivity(): Promise<IDiscussionBoardArticleActivityStatistics> {
  // Default range: last 30 days (inclusive)
  const end = toISOStringSafe(new Date());
  const start = toISOStringSafe(
    new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
  );

  // Fetch data in parallel using cross-compatible Prisma queries
  const [articles, comments, attachments, tagLinks] = await Promise.all([
    MyGlobal.prisma.discussion_board_articles.findMany({
      where: {
        state: "published",
        deleted_at: null,
        published_at: { gte: start, lte: end },
      },
      select: { id: true, published_at: true },
    }),

    MyGlobal.prisma.discussion_board_comments.findMany({
      where: {
        deleted_at: null,
        is_hidden: false,
        created_at: { gte: start, lte: end },
        article: {
          state: "published",
          deleted_at: null,
          published_at: { gte: start, lte: end },
        },
      },
      select: { id: true, created_at: true, discussion_board_article_id: true },
    }),

    MyGlobal.prisma.discussion_board_attachments.findMany({
      where: {
        deleted_at: null,
        created_at: { gte: start, lte: end },
        article: {
          state: "published",
          deleted_at: null,
          published_at: { gte: start, lte: end },
        },
      },
      select: { id: true, created_at: true, discussion_board_article_id: true },
    }),

    MyGlobal.prisma.discussion_board_article_tags.findMany({
      where: {
        article: {
          state: "published",
          deleted_at: null,
          published_at: { gte: start, lte: end },
        },
      },
      include: {
        tag: { select: { name: true, slug: true, deleted_at: true } },
      },
    }),
  ]);

  // Validate computed dates
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || startMs > endMs) {
    throw new HttpException("Invalid computed date range", 400);
  }

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const days = Math.floor((endMs - startMs) / MS_PER_DAY) + 1;

  // Prepare daily buckets (UTC calendar days) as immutable map
  const buckets: Record<
    string,
    { article_count: number; comment_count: number; attachment_count: number }
  > = {};
  for (let i = 0; i < days; i++) {
    const dayMs = startMs + i * MS_PER_DAY;
    const dayDateTime = toISOStringSafe(new Date(dayMs));
    const day = dayDateTime.slice(0, 10); // YYYY-MM-DD
    buckets[day] = { article_count: 0, comment_count: 0, attachment_count: 0 };
  }

  // Index articles for fast membership checks and populate article counts per day
  const articleIdSet = new Set<string>();
  for (const a of articles) {
    if (!a.published_at) continue;
    const publishedAt = toISOStringSafe(a.published_at);
    const day = publishedAt.slice(0, 10);
    if (!(day in buckets)) {
      // If published_at falls outside computed range (edge cases), ensure bucket exists
      buckets[day] = {
        article_count: 0,
        comment_count: 0,
        attachment_count: 0,
      };
    }
    buckets[day].article_count += 1;
    articleIdSet.add(a.id);
  }

  // Aggregate comments and attachments (only count those attached to included articles)
  let commentTotal = 0;
  for (const c of comments) {
    if (!c.created_at) continue;
    if (!articleIdSet.has(c.discussion_board_article_id)) continue;
    const createdAt = toISOStringSafe(c.created_at);
    const day = createdAt.slice(0, 10);
    if (!(day in buckets))
      buckets[day] = {
        article_count: 0,
        comment_count: 0,
        attachment_count: 0,
      };
    buckets[day].comment_count += 1;
    commentTotal += 1;
  }

  let attachmentTotal = 0;
  for (const att of attachments) {
    if (!att.created_at) continue;
    if (!articleIdSet.has(att.discussion_board_article_id)) continue;
    const createdAt = toISOStringSafe(att.created_at);
    const day = createdAt.slice(0, 10);
    if (!(day in buckets))
      buckets[day] = {
        article_count: 0,
        comment_count: 0,
        attachment_count: 0,
      };
    buckets[day].attachment_count += 1;
    attachmentTotal += 1;
  }

  // Build time_series ordered descending by date
  const time_series = Object.keys(buckets)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({
      date,
      article_count: buckets[date].article_count,
      comment_count: buckets[date].comment_count,
      attachment_count: buckets[date].attachment_count,
    }));

  // Top tags aggregation
  const tagMap: Record<string, { name: string; slug: string; count: number }> =
    {};
  for (const link of tagLinks) {
    const tag = link.tag;
    if (!tag) continue;
    if (tag.deleted_at) continue; // skip soft-deleted tags
    const key = tag.slug;
    if (!tagMap[key])
      tagMap[key] = { name: tag.name, slug: tag.slug, count: 0 };
    tagMap[key].count += 1;
  }

  const top_tags = Object.values(tagMap)
    .sort((a, b) => b.count - a.count)
    .map((t) => ({ name: t.name, slug: t.slug, count: t.count }));

  // Summary
  const articleCount = articles.length;
  const summary = {
    article_count: articleCount,
    comment_count: commentTotal,
    attachment_count: attachmentTotal,
    average_comments_per_article:
      articleCount === 0 ? null : commentTotal / articleCount,
  };

  return {
    summary,
    time_series,
    top_tags: top_tags.length > 0 ? top_tags : undefined,
  };
}
