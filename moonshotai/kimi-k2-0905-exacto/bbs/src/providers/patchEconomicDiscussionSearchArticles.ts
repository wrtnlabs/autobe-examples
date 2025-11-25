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

export async function patchEconomicDiscussionSearchArticles(props: {
  body: IEconomicDiscussionArticle.IRequest;
}): Promise<IPageIEconomicDiscussionArticle.ISummary> {
  // Extract pagination parameters
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build comprehensive WHERE conditions
  const whereConditions: any = {};

  // Status filtering
  if (props.body.status !== undefined && props.body.status !== null) {
    whereConditions.status = props.body.status;
  }

  // Author filtering - articles can have either member or moderator author
  if (props.body.author !== undefined && props.body.author !== null) {
    whereConditions.OR = [
      { economic_discussion_member_id: props.body.author },
      { economic_discussion_moderator_id: props.body.author },
    ];
  }

  // Date range filtering
  if (
    props.body.created_after !== undefined &&
    props.body.created_after !== null
  ) {
    whereConditions.created_at = {
      ...whereConditions.created_at,
      gte: props.body.created_after,
    };
  }
  if (
    props.body.created_before !== undefined &&
    props.body.created_before !== null
  ) {
    whereConditions.created_at = {
      ...whereConditions.created_at,
      lte: props.body.created_before,
    };
  }

  // View count range filtering
  if (
    props.body.view_count_min !== undefined &&
    props.body.view_count_min !== null
  ) {
    whereConditions.view_count = {
      ...whereConditions.view_count,
      gte: props.body.view_count_min,
    };
  }
  if (
    props.body.view_count_max !== undefined &&
    props.body.view_count_max !== null
  ) {
    whereConditions.view_count = {
      ...whereConditions.view_count,
      lte: props.body.view_count_max,
    };
  }

  // Full-text search using PostgreSQL operators
  if (props.body.search !== undefined && props.body.search !== null) {
    // Use PostgreSQL full-text search for better performance
    whereConditions.AND = [
      ...(whereConditions.AND || []),
      {
        OR: [
          { title: { search: props.body.search } },
          { content: { search: props.body.search } },
        ],
      },
    ];
  }

  // Category filtering through junction table
  if (
    props.body.categories_code !== undefined &&
    props.body.categories_code !== null &&
    props.body.categories_code.length > 0
  ) {
    // Get category IDs for the codes
    const categories =
      await MyGlobal.prisma.economic_discussion_categories.findMany({
        where: { code: { in: props.body.categories_code } },
      });

    if (categories.length > 0) {
      const categoryIds = categories.map((c) => c.id);
      whereConditions.economic_discussion_article_categories = {
        some: {
          economic_discussion_category_id: { in: categoryIds },
        },
      };
    }
  }

  // Define sorting logic
  let orderBy: any = { created_at: "desc" }; // Default sort
  if (props.body.sort_by !== undefined && props.body.sort_by !== null) {
    const sortOrder = props.body.sort_order === "asc" ? "asc" : "desc";
    switch (props.body.sort_by) {
      case "created_at":
        orderBy = { created_at: sortOrder };
        break;
      case "view_count":
        orderBy = { view_count: sortOrder };
        break;
      case "title":
        orderBy = { title: sortOrder };
        break;
      default: // relevance (or default)
        orderBy = { created_at: "desc" }; // Fallback to creation date for relevance
        break;
    }
  }

  // Execute main query and total count in parallel
  const [articles, totalCount] = await Promise.all([
    MyGlobal.prisma.economic_discussion_articles.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      include: {
        economic_discussion_article_categories: {
          include: {
            category: true,
          },
        },
        economic_discussion_attachments: {
          select: { id: true },
        },
        economic_discussion_comments: {
          select: { id: true },
        },
      },
    }),
    MyGlobal.prisma.economic_discussion_articles.count({
      where: whereConditions,
    }),
  ]);

  // Build proper pagination metadata
  const pagination: IPage.IPagination = {
    current: page.toString() as string & tags.Format<"uuid">,
    limit: limit.toString() as string & tags.Format<"uuid">,
    records: totalCount.toString() as string & tags.Format<"uuid">,
    pages: Math.ceil(totalCount / limit).toString() as string &
      tags.Format<"uuid">,
  };

  return {
    data: await Promise.all(
      articles.map(async (article) => {
        // Get member author separately
        let memberAuthor = undefined;
        if (article.economic_discussion_member_id) {
          memberAuthor =
            await MyGlobal.prisma.economic_discussion_members.findUnique({
              where: { id: article.economic_discussion_member_id },
            });
        }

        // Get moderator author separately
        let moderatorAuthor = undefined;
        if (article.economic_discussion_moderator_id) {
          moderatorAuthor =
            await MyGlobal.prisma.economic_discussion_moderators.findUnique({
              where: { id: article.economic_discussion_moderator_id },
            });
        }

        return {
          id: article.id,
          title: article.title,
          view_count: article.view_count,
          created_at: toISOStringSafe(article.created_at),
          updated_at: toISOStringSafe(article.updated_at),
          economic_discussion_member_id:
            article.economic_discussion_member_id ?? "",
          economic_discussion_moderator_id:
            article.economic_discussion_moderator_id ?? "",
          member_author: memberAuthor
            ? {
                id: memberAuthor.id,
                username: memberAuthor.username,
                email_verified: memberAuthor.email_verified,
                reputation_score: memberAuthor.reputation_score,
                created_at: toISOStringSafe(memberAuthor.created_at),
              }
            : undefined,
          moderator_author: moderatorAuthor
            ? {
                id: moderatorAuthor.id,
                username: moderatorAuthor.username,
                moderation_level: moderatorAuthor.moderation_level as
                  | "standard"
                  | "senior"
                  | "admin",
                created_at: toISOStringSafe(moderatorAuthor.created_at),
              }
            : undefined,
          categories: (
            (article as any).economic_discussion_article_categories || []
          ).map((ac: any) => ({
            id: ac.category.id,
            code: ac.category.code,
            name: ac.category.name,
            display_order: ac.category.display_order,
            is_active: ac.category.is_active,
            article_count: ac.category.article_count,
          })),
          attachments_count: (
            (article as any).economic_discussion_attachments || []
          ).length,
          comments_count: ((article as any).economic_discussion_comments || [])
            .length,
          status: article.status as "pending" | "approved" | "rejected",
        };
      }),
    ),
    pagination,
  };
}
