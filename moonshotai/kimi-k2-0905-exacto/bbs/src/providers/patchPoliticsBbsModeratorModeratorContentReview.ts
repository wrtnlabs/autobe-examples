import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsModerationReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerationReview";
import { IPageIPoliticsBbsModerationReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticsBbsModerationReview";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchPoliticsBbsModeratorModeratorContentReview(props: {
  moderator: ModeratorPayload;
  body: IPoliticsBbsModerationReview.IRequest;
}): Promise<IPageIPoliticsBbsModerationReview.ISummary> {
  const { body } = props;

  // Extract pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build base where conditions for articles requiring review
  const articleWhere = {
    deleted_at: null,
    state: { in: body.statuses },
    ...(body.categoryCode !== undefined &&
      body.categoryCode !== null && {
        category: {
          code: body.categoryCode,
          deleted_at: null,
        },
      }),
    ...(body.createdAfter !== undefined &&
      body.createdAfter !== null && {
        created_at: { gte: body.createdAfter },
      }),
    ...(body.createdBefore !== undefined &&
      body.createdBefore !== null && {
        created_at: { lte: body.createdBefore },
      }),
    ...(body.search && {
      OR: [
        { title: { contains: body.search } },
        { content: { contains: body.search } },
        { creator: { username: { contains: body.search } } },
      ],
    }),
  };

  // Build base where conditions for comments requiring review
  const commentWhere = {
    deleted_at: null,
    status: { in: body.statuses },
    NOT: { actor_type: "moderator" }, // Exclude moderator comments from review
    ...(body.createdAfter !== undefined &&
      body.createdAfter !== null && {
        created_at: { gte: body.createdAfter },
      }),
    ...(body.createdBefore !== undefined &&
      body.createdBefore !== null && {
        created_at: { lte: body.createdBefore },
      }),
    ...(body.search && {
      OR: [
        { content: { contains: body.search } },
        {
          article: {
            OR: [
              { title: { contains: body.search } },
              { creator: { username: { contains: body.search } } },
            ],
          },
        },
      ],
    }),
  };

  // Determine content type filtering strategy
  const fetchArticles =
    body.contentType === "article" || body.contentType === "all";
  const fetchComments =
    body.contentType === "comment" || body.contentType === "all";

  let articles: any[] = [];
  let comments: any[] = [];
  let articleCount = 0;
  let commentCount = 0;

  // Fetch articles pending review
  if (fetchArticles) {
    [articles, articleCount] = await Promise.all([
      MyGlobal.prisma.politics_bbs_articles.findMany({
        where: articleWhere,
        include: {
          category: {
            select: { id: true, name: true, code: true },
          },
          creator: {
            select: { id: true, username: true },
          },
        },
        orderBy: { created_at: "desc" },
      }),
      MyGlobal.prisma.politics_bbs_articles.count({ where: articleWhere }),
    ]);
  }

  // Fetch comments pending review
  if (fetchComments) {
    [comments, commentCount] = await Promise.all([
      MyGlobal.prisma.politics_bbs_comments.findMany({
        where: commentWhere,
        include: {
          article: {
            select: {
              id: true,
              title: true,
              creator: {
                select: { id: true, username: true },
              },
            },
          },
        },
        orderBy: { created_at: "desc" },
      }),
      MyGlobal.prisma.politics_bbs_comments.count({ where: commentWhere }),
    ]);
  }

  // Create moderation review summaries for articles
  const articleSummaries: IPoliticsBbsModerationReview.ISummary[] =
    articles.map((article) => ({
      id: v4() as string & tags.Format<"uuid">, // Generate review ID
      politics_bbs_article_snapshot_id: article.id,
      politics_bbs_moderator_id: props.moderator.id satisfies string as string,
      title: article.title,
      reason_code: "ARTICLE_" + article.state.replace(/_/g, "").toUpperCase(),
      status: article.state as
        | "pending"
        | "approved"
        | "rejected"
        | "appealed"
        | "dismissed",
      previous_status: null, // No previous status recorded
      created_at: toISOStringSafe(article.created_at),
    }));

  // Create moderation review summaries for comments
  const commentSummaries: IPoliticsBbsModerationReview.ISummary[] =
    comments.map((comment) => ({
      id: v4() as string & tags.Format<"uuid">, // Generate review ID
      politics_bbs_article_snapshot_id: comment.article.id,
      politics_bbs_moderator_id: props.moderator.id satisfies string as string,
      title: `Comment on "${comment.article.title}" by ${comment.actor_type}`,
      reason_code: "COMMENT_" + comment.status.replace(/_/g, "").toUpperCase(),
      status: comment.status as
        | "pending"
        | "approved"
        | "rejected"
        | "appealed"
        | "dismissed",
      previous_status: null, // No previous status recorded
      created_at: toISOStringSafe(comment.created_at),
    }));

  // Combine and sort all reviewed items by creation date (newest first)
  const allItems = [...articleSummaries, ...commentSummaries].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // Apply pagination to the combined results
  const startIndex = skip;
  const endIndex = startIndex + limit;
  const paginatedItems = allItems.slice(startIndex, endIndex);
  const totalCount = articleCount + commentCount;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    pagination: {
      current: Number(page) as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: Number(limit) as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: totalCount as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: totalPages as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    data: paginatedItems,
  };
}
