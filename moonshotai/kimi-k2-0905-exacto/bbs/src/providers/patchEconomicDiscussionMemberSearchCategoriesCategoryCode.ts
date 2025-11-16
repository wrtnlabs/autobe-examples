import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IPageIEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionArticle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchEconomicDiscussionMemberSearchCategoriesCategoryCode(props: {
  member: MemberPayload;
  categoryCode: string;
  body: IEconomicDiscussionArticle.IRequest;
}): Promise<IPageIEconomicDiscussionArticle.ISummary> {
  // Validate category exists and is active
  const category =
    await MyGlobal.prisma.economic_discussion_categories.findFirst({
      where: {
        code: props.categoryCode,
        is_active: true,
        deleted_at: null,
      },
    });

  if (!category) {
    throw new HttpException("Category not found or inactive", 404);
  }

  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build where conditions for complex filtering
  const whereConditions: Record<string, unknown> = {
    deleted_at: null,
  };

  // Add category filter - articles must be in the specified category
  const categoryArticleIds =
    await MyGlobal.prisma.economic_discussion_article_categories
      .findMany({
        where: {
          economic_discussion_category_id: category.id,
        },
        select: {
          economic_discussion_article_id: true,
        },
      })
      .then((categories) =>
        categories.map((cat) => cat.economic_discussion_article_id),
      );

  if (categoryArticleIds.length > 0) {
    whereConditions.id = { in: categoryArticleIds };
  } else {
    // No articles in this category, return empty result
    return {
      data: [],
      pagination: {
        current: String(page) as ICrIPageIntegerRequired,
        pages: "0" as ICrIPageIntegerRequired,
        limit: String(limit) as ICrIPageIntegerRequired,
        records: "0" as ICrIPageIntegerRequired,
      },
    };
  }

  // Add search filter if provided
  if (props.body.search) {
    whereConditions.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { content: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Add status filter if provided (for regular members, only show approved articles)
  if (props.body.status) {
    whereConditions.status = props.body.status;
  } else {
    // Default to approved articles only for regular members
    whereConditions.status = "approved";
  }

  // Add author filter if provided
  if (props.body.author) {
    const authorIds = await MyGlobal.prisma.economic_discussion_articles
      .findMany({
        where: {
          OR: [
            { economic_discussion_member_id: props.body.author },
            { economic_discussion_moderator_id: props.body.author },
          ],
        },
        select: { id: true },
      })
      .then((articles) => articles.map((article) => article.id));

    if (
      whereConditions.id &&
      typeof whereConditions.id === "object" &&
      "in" in whereConditions.id
    ) {
      // Intersect with existing category filter
      const categoryIds = Array.isArray(whereConditions.id.in)
        ? whereConditions.id.in
        : [];
      whereConditions.id = {
        in: categoryIds.filter((id) => authorIds.includes(id)),
      };
    } else {
      whereConditions.id = { in: authorIds };
    }
  }

  // Add date range filters
  if (props.body.created_after || props.body.created_before) {
    (whereConditions as any).created_at = {};
    if (props.body.created_after) {
      (whereConditions as any).created_at.gte = props.body.created_after;
    }
    if (props.body.created_before) {
      (whereConditions as any).created_at.lte = props.body.created_before;
    }
  }

  // Add view count filters
  if (
    props.body.view_count_min !== undefined &&
    props.body.view_count_min !== null
  ) {
    whereConditions.view_count = { gte: props.body.view_count_min };
  }
  if (
    props.body.view_count_max !== undefined &&
    props.body.view_count_max !== null
  ) {
    if (!whereConditions.view_count) whereConditions.view_count = {};
    (whereConditions as any).view_count = {
      ...(whereConditions as any).view_count,
      lte: props.body.view_count_max,
    };
  }

  // Determine sort order
  const orderBy = props.body.sort_by
    ? {
        [props.body.sort_by === "relevance"
          ? "created_at"
          : props.body.sort_by]: props.body.sort_order || "desc",
      }
    : { created_at: "desc" as const };

  // Get total count first
  const total = await MyGlobal.prisma.economic_discussion_articles.count({
    where: whereConditions,
  });

  // Get paginated results with appropriate includes
  const articles = await MyGlobal.prisma.economic_discussion_articles.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy,
    include: {
      economic_discussion_article_categories: true,
      economic_discussion_attachments: {
        select: { id: true },
      },
      economic_discussion_comments: {
        select: { id: true },
      },
    },
  });

  // Transform results to match API structure
  const transformedArticles = articles.map((article) => {
    const authorId =
      article.economic_discussion_member_id ||
      article.economic_discussion_moderator_id;

    return {
      id: article.id as string & tags.Format<"uuid">,
      title: article.title,
      view_count: article.view_count,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      economic_discussion_member_id:
        article.economic_discussion_member_id as string & tags.Format<"uuid">,
      economic_discussion_moderator_id:
        article.economic_discussion_moderator_id as string &
          tags.Format<"uuid">,
      member_author: article.economic_discussion_member_id
        ? {
            id: article.economic_discussion_member_id as string &
              tags.Format<"uuid">,
            username: "",
            email_verified: true,
            reputation_score: 0,
            created_at: toISOStringSafe(article.created_at),
          }
        : undefined,
      moderator_author: article.economic_discussion_moderator_id
        ? {
            id: article.economic_discussion_moderator_id as string &
              tags.Format<"uuid">,
            username: "",
            moderation_level: "admin" as const,
            created_at: toISOStringSafe(article.created_at),
          }
        : undefined,
      categories: article.economic_discussion_article_categories
        ? article.economic_discussion_article_categories.map((cat: any) => ({
            id: cat.economic_discussion_category.id as string &
              tags.Format<"uuid">,
            code: cat.economic_discussion_category.code,
            name: cat.economic_discussion_category.name,
            is_active: cat.economic_discussion_category.is_active,
            display_order: cat.economic_discussion_category.display_order,
            article_count: cat.economic_discussion_category.article_count,
          }))
        : [],
      attachments_count: article.economic_discussion_attachments?.length || 0,
      comments_count: article.economic_discussion_comments?.length || 0,
      status: article.status as "pending" | "approved" | "rejected",
    };
  });

  return {
    data: transformedArticles,
    pagination: {
      current: String(page) as ICrIPageIntegerRequired,
      pages: String(Math.ceil(total / limit)) as ICrIPageIntegerRequired,
      limit: String(limit) as ICrIPageIntegerRequired,
      records: String(total) as ICrIPageIntegerRequired,
    },
  };
}
