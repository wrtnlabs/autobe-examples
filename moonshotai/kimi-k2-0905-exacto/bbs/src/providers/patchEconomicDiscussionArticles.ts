import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function patchEconomicDiscussionArticles(props: {
  body: IEconomicDiscussionArticle.IRequest;
}): Promise<IPageIEconomicDiscussionArticle.ISummary> {
  const {
    page,
    limit,
    search,
    categories_code,
    status,
    author,
    created_after,
    created_before,
    view_count_min,
    view_count_max,
    sort_by,
    sort_order,
  } = props.body;

  // Calculate pagination
  const skip = (page - 1) * limit;
  const take = limit;

  // Build where conditions
  const where: Prisma.economic_discussion_articlesWhereInput = {
    deleted_at: null,
  };

  // Add text search
  if (search?.trim()) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  // Add category filtering
  if (categories_code?.length) {
    where.economic_discussion_article_categories = {
      some: {
        category: {
          code: { in: categories_code },
        },
      },
    };
  }

  // Add status filter - handle nullable status
  if (status !== undefined && status !== null) {
    where.status = status;
  }

  // Add author filtering
  if (author) {
    const authorCondition = {
      OR: [
        { economic_discussion_member_id: author },
        { economic_discussion_moderator_id: author },
      ],
    };

    if (where.OR) {
      // Combine search OR with author OR
      where.AND = [{ OR: where.OR }, authorCondition];
      delete where.OR;
    } else {
      where.OR = authorCondition.OR;
    }
  }

  // Add date range filters
  if (created_after || created_before) {
    where.created_at = {};
    if (created_after) {
      where.created_at.gte = created_after;
    }
    if (created_before) {
      where.created_at.lte = created_before;
    }
  }

  // Add view count filters
  if (view_count_min !== undefined && view_count_min !== null) {
    where.view_count = { gte: view_count_min };
  }
  if (view_count_max !== undefined && view_count_max !== null) {
    if (
      where.view_count &&
      typeof where.view_count === "object" &&
      !Array.isArray(where.view_count)
    ) {
      (where.view_count as Prisma.IntFilter).lte = view_count_max;
    } else {
      where.view_count = { lte: view_count_max };
    }
  }

  // Build order by - filter out invalid fields
  const orderBy: Prisma.economic_discussion_articlesOrderByWithRelationInput =
    {};
  const field = sort_by || "created_at";
  const direction = sort_order || "desc";

  // Only use valid fields for ordering - filter out 'relevance'
  const validFields = ["created_at", "title", "view_count", "updated_at"];
  const orderField = validFields.includes(field) ? field : "created_at";

  if (orderField === "created_at") {
    orderBy.created_at = direction;
  } else if (orderField === "title") {
    orderBy.title = direction;
  } else if (orderField === "view_count") {
    orderBy.view_count = direction;
  } else {
    orderBy.updated_at = direction;
  }

  // Execute queries in parallel
  const [articles, totalCount] = await Promise.all([
    MyGlobal.prisma.economic_discussion_articles.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        member: true,
        moderator: true,
        economic_discussion_article_categories: {
          include: {
            category: true,
          },
        },
        _count: {
          select: {
            economic_discussion_comments: true,
            economic_discussion_attachments: true,
          },
        },
      },
    }),
    MyGlobal.prisma.economic_discussion_articles.count({ where }),
  ]);

  // Transform results to API format
  const data: IEconomicDiscussionArticle.ISummary[] = articles.map(
    (article) => ({
      id: article.id,
      title: article.title,
      view_count: article.view_count,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      economic_discussion_member_id:
        article.economic_discussion_member_id !== null
          ? (article.economic_discussion_member_id satisfies string as string)
          : typia.assert<string & tags.Format<"uuid">>(v4()),
      economic_discussion_moderator_id:
        article.economic_discussion_moderator_id !== null
          ? (article.economic_discussion_moderator_id satisfies string as string)
          : typia.assert<string & tags.Format<"uuid">>(v4()),
      member_author: article.member
        ? {
            id: article.member.id,
            username: article.member.username,
            email_verified: article.member.email_verified,
            reputation_score: article.member.reputation_score,
            created_at: toISOStringSafe(article.member.created_at),
          }
        : undefined,
      moderator_author: article.moderator
        ? {
            id: article.moderator.id,
            username: article.moderator.username,
            moderation_level: typia.assert<"admin" | "standard" | "senior">(
              article.moderator.moderation_level,
            ),
            created_at: toISOStringSafe(article.moderator.created_at),
          }
        : undefined,
      categories: article.economic_discussion_article_categories.map((ac) => ({
        id: ac.category.id,
        code: ac.category.code,
        name: ac.category.name,
        display_order: ac.category.display_order,
        is_active: ac.category.is_active,
        article_count: ac.category.article_count,
      })),
      attachments_count: article._count.economic_discussion_attachments,
      comments_count: article._count.economic_discussion_comments,
      status: typia.assert<"pending" | "approved" | "rejected">(article.status),
    }),
  );

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);

  return {
    data,
    pagination: {
      current: page.toString(),
      limit: limit.toString(),
      records: totalCount.toString(),
      pages: totalPages.toString(),
    },
  };
}
