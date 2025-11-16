import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function patchDiscussionBoardMemberUserMembersMemberUserIdLikedArticles(props: {
  memberUser: MemberuserPayload;
  memberUserId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const pageInput = props.body.page;
  const limitInput = props.body.limit;

  const page = pageInput === undefined ? 1 : pageInput;
  const limit = limitInput === undefined ? 20 : limitInput;
  const effectiveLimit = limit <= 0 ? 0 : limit;

  // Build basic article filter from request body using only scalar fields
  const articleWhere: Record<string, unknown> = {
    deleted_at: null,
  };

  if (props.body.search !== undefined) {
    const search = props.body.search;
    (articleWhere as any).OR = [
      { title: { contains: search, mode: "insensitive" } },
      { body: { contains: search, mode: "insensitive" } },
    ];
  }

  if (props.body.categoryId !== undefined) {
    (articleWhere as any).discussion_board_article_category_id =
      props.body.categoryId;
  }

  if (props.body.moderationState !== undefined) {
    (articleWhere as any).moderation_state = props.body.moderationState;
  }

  if (
    props.body.createdFrom !== undefined ||
    props.body.createdTo !== undefined
  ) {
    const createdAtRange: Record<string, unknown> = {};
    if (props.body.createdFrom !== undefined)
      createdAtRange.gte = props.body.createdFrom;
    if (props.body.createdTo !== undefined)
      createdAtRange.lte = props.body.createdTo;
    (articleWhere as any).created_at = createdAtRange;
  }

  // Load like records for this member user
  const likes = await MyGlobal.prisma.discussion_board_article_likes.findMany({
    where: {
      discussion_board_memberuser_id: props.memberUserId,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  if (likes.length === 0) {
    return {
      pagination: {
        current: 0,
        limit: effectiveLimit,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  const likedArticleIds = likes.map((like) => like.discussion_board_article_id);

  // Fetch articles matching liked IDs and filters (no includes to avoid invalid relations)
  const articles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: {
      id: { in: likedArticleIds },
      ...(articleWhere as Record<string, unknown>),
    },
  });

  if (articles.length === 0) {
    return {
      pagination: {
        current: 0,
        limit: effectiveLimit,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // Map articles by id for stable ordering and uniqueness
  const articleMap = new Map<string, (typeof articles)[number]>();
  for (const article of articles) articleMap.set(article.id, article);

  const orderDirection = props.body.orderDirection === "asc" ? "asc" : "desc";

  const orderedArticles = Array.from(articleMap.values()).sort((a, b) => {
    const aTime = a.created_at.getTime();
    const bTime = b.created_at.getTime();
    if (aTime === bTime) return 0;
    if (orderDirection === "asc") return aTime - bTime;
    return bTime - aTime;
  });

  const totalCount = orderedArticles.length;

  if (effectiveLimit === 0 || totalCount === 0) {
    return {
      pagination: {
        current: 0,
        limit: effectiveLimit,
        records: totalCount,
        pages: 0,
      },
      data: [],
    };
  }

  const pages = Math.ceil(totalCount / effectiveLimit);
  const current = Math.min(page - 1, pages - 1);
  const skip = current * effectiveLimit;

  const pageItems = orderedArticles.slice(skip, skip + effectiveLimit);

  // Preload categories referenced by these articles for summary mapping
  const categoryIds = Array.from(
    new Set(
      pageItems
        .map((a) => a.discussion_board_article_category_id)
        .filter((id): id is string => id !== null && id !== undefined),
    ),
  );

  const categories =
    await MyGlobal.prisma.discussion_board_article_categories.findMany({
      where: { id: { in: categoryIds } },
    });

  const categoryMap = new Map<string, (typeof categories)[number]>();
  for (const category of categories) categoryMap.set(category.id, category);

  // Compute like and comment counts per article via aggregation
  const articleIdList = pageItems.map((a) => a.id);

  const [likeCounts, commentCounts] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_likes.groupBy({
      by: ["discussion_board_article_id"],
      where: {
        discussion_board_article_id: { in: articleIdList },
      },
      _count: {
        _all: true,
      },
    }),
    MyGlobal.prisma.discussion_board_comments.groupBy({
      by: ["discussion_board_article_id"],
      where: {
        discussion_board_article_id: { in: articleIdList },
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const likeCountMap = new Map<string, number>();
  for (const row of likeCounts)
    likeCountMap.set(row.discussion_board_article_id, row._count._all);

  const commentCountMap = new Map<string, number>();
  for (const row of commentCounts)
    commentCountMap.set(row.discussion_board_article_id, row._count._all);

  // Placeholder author summary using the requesting member user
  const placeholderAuthor: IDiscussionBoardMemberuser.ISummary = {
    id: props.memberUser.id,
    display_name: "",
    account_status: "active",
    created_at: toISOStringSafe(new Date()),
  };

  const data = pageItems.map((article) => {
    const categoryRow = categoryMap.get(
      article.discussion_board_article_category_id,
    );
    if (!categoryRow) {
      throw new HttpException("Article category not found", 500);
    }

    const excerpt = article.summary === null ? null : article.summary;

    const likeCount = likeCountMap.get(article.id) ?? 0;
    const commentCount = commentCountMap.get(article.id) ?? 0;

    const categorySummary: IDiscussionBoardArticleCategory.ISummary = {
      id: categoryRow.id,
      code: categoryRow.code,
      name: categoryRow.name,
      description: categoryRow.description,
    };

    return {
      id: article.id,
      title: article.title,
      excerpt,
      category: categorySummary,
      author: placeholderAuthor,
      createdAt: toISOStringSafe(article.created_at),
      likeCount,
      commentCount,
    };
  });

  return {
    pagination: {
      current,
      limit: effectiveLimit,
      records: totalCount,
      pages,
    },
    data,
  };
}
