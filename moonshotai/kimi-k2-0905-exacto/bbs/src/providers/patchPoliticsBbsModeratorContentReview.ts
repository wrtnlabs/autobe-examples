import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsContentReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsContentReview";
import { IPageIPoliticsBbsContentReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticsBbsContentReview";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPoliticsBbsArticleCreator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticleCreator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchPoliticsBbsModeratorContentReview(props: {
  moderator: ModeratorPayload;
  body: IPoliticsBbsContentReview.IRequest;
}): Promise<IPageIPoliticsBbsContentReview.ISummary> {
  const {
    page,
    limit,
    contentType = "all",
    statuses,
    search = "",
    categoryCode,
    createdAfter,
    createdBefore,
  } = props.body;

  // Validate pagination
  if (page < 1 || limit < 1 || limit > 100) {
    throw new HttpException("Invalid pagination parameters", 400);
  }

  const skip = (page - 1) * limit;
  const statusSet = new Set(statuses);

  // Build where conditions
  const articleWhere: Record<string, unknown> = {
    deleted_at: null,
    ...(contentType !== "comment" && {
      ...(statusSet.has("pending") && { state: "pending" }),
    }),
  };

  const commentWhere: Record<string, unknown> = {
    deleted_at: null,
    ...(contentType !== "article" && {
      ...(statusSet.has("pending") && { status: "pending" }),
      ...(statusSet.has("flagged") && { status: "flagged" }),
    }),
  };

  // Apply search filter
  if (search && search.length > 0) {
    articleWhere.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
    ];
    commentWhere.OR = [{ content: { contains: search } }];
  }

  // Apply category filter for articles
  if (categoryCode && contentType !== "comment") {
    const category = await MyGlobal.prisma.politics_bbs_categories.findUnique({
      where: { code: categoryCode },
    });
    if (category) {
      articleWhere.politics_bbs_category_id = category.id;
    }
  }

  // Apply date filters
  if (createdAfter || createdBefore) {
    if (createdAfter) {
      articleWhere.created_at = { gte: createdAfter };
      commentWhere.created_at = { gte: createdAfter };
    }
    if (createdBefore) {
      articleWhere.created_at = articleWhere.created_at || {};
      commentWhere.created_at = commentWhere.created_at || {};
      (articleWhere.created_at as Record<string, unknown>).lte = createdBefore;
      (commentWhere.created_at as Record<string, unknown>).lte = createdBefore;
    }
  }

  // Fetch results in parallel
  const [articles, articleCount, comments, commentCount] = await Promise.all([
    contentType !== "comment"
      ? MyGlobal.prisma.politics_bbs_articles.findMany({
          where: articleWhere,
          include: {
            category: { select: { id: true, code: true, name: true } },
            creator: { select: { id: true, username: true, created_at: true } },
          },
          orderBy: { created_at: "desc" },
          skip,
          take: limit,
        })
      : [],

    contentType !== "comment"
      ? MyGlobal.prisma.politics_bbs_articles.count({
          where: articleWhere,
        })
      : 0,

    contentType !== "article"
      ? MyGlobal.prisma.politics_bbs_comments.findMany({
          where: commentWhere,
          include: {
            article: {
              select: {
                id: true,
                title: true,
                politics_bbs_category_id: true,
                creator: {
                  select: { id: true, username: true, created_at: true },
                },
              },
            },
          },
          orderBy: { created_at: "desc" },
          skip,
          take: limit,
        })
      : [],

    contentType !== "article"
      ? MyGlobal.prisma.politics_bbs_comments.count({
          where: commentWhere,
        })
      : 0,
  ]);

  // Process articles
  const articleReviews: IPoliticsBbsContentReview.ISummary[] = articles.map(
    (article) => ({
      id: article.id,
      politics_bbs_article_id: article.id,
      politics_bbs_category_id: article.category.id,
      category_code: article.category.code,
      category_name: article.category.name,
      article_title: article.title,
      article_creator: {
        id: article.creator.id,
        username: article.creator.username,
        account_type: "member",
        created_at: toISOStringSafe(article.creator.created_at),
      },
      review_type: "initial_submission",
      priority: "normal",
      violations: [],
      status: article.state,
      reviewed_by: null,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      expires_at: toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    }),
  );

  // Process comments
  const commentReviews: IPoliticsBbsContentReview.ISummary[] = comments.map(
    (comment) => ({
      id: comment.id,
      politics_bbs_article_id: comment.article.id,
      politics_bbs_category_id: comment.article.politics_bbs_category_id,
      category_code: "unknown",
      category_name: "Unknown",
      article_title: comment.article.title,
      article_creator: {
        id: comment.article.creator?.id ?? v4(),
        username: comment.article.creator?.username ?? "Unknown",
        account_type: "member",
        created_at: toISOStringSafe(
          comment.article.creator?.created_at ?? new Date(),
        ),
      },
      review_type: "community_flagged",
      priority: comment.status === "flagged" ? "urgent" : "normal",
      violations: [],
      status: comment.status,
      reviewed_by: null,
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
      expires_at: toISOStringSafe(new Date(Date.now() + 6 * 60 * 60 * 1000)),
    }),
  );

  // Combine results
  const data = [...articleReviews, ...commentReviews];

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(articleCount + commentCount),
      pages: Number(Math.ceil((articleCount + commentCount) / limit)),
    },
    data,
  };
}
