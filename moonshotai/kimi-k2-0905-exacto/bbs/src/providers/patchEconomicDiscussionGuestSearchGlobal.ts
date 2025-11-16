import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearch";
import { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import { IPageIEconomicDiscussionSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionSearchQuery";
import { IEconomicDiscussionSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchQuery";
import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import { IEconomicDiscussionSearchMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchMetadata";
import { IEconomicDiscussionSearchFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchFilters";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function patchEconomicDiscussionGuestSearchGlobal(props: {
  guest: GuestPayload;
  body: IEconomicDiscussionSearch.IRequest;
}): Promise<IPageIEconomicDiscussionSearchQuery.ISummary> {
  const {
    query,
    categories,
    scope = "all",
    sort_by = "relevance",
    order = "desc",
    page = 1,
    limit = 20,
  } = props.body;

  const startTime = Date.now();

  const skip = (page - 1) * limit;
  const take = limit;

  const categoryIds = categories?.map((cat) => cat.id) || [];

  const whereCondition: Prisma.economic_discussion_articlesWhereInput = {
    ...(query &&
      query.trim() && {
        OR: [
          {
            title: {
              contains: query satisfies string as string,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            content: {
              contains: query satisfies string as string,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }),
    ...(categoryIds.length > 0 && {
      category_id: { in: categoryIds satisfies string[] as string[] },
    }),
    ...((scope === "member" || scope === "all") && {
      OR: [
        { status: "approved" },
        { economic_discussion_member_id: { not: null } },
      ],
    }),
    ...(scope === "moderator" && {}),
    deleted_at: null,
  };

  const [articles, total] = await Promise.all([
    MyGlobal.prisma.economic_discussion_articles.findMany({
      where: whereCondition,
      orderBy: (() => {
        switch (sort_by) {
          case "created_at":
            return { created_at: order };
          case "updated_at":
            return { updated_at: order };
          case "view_count":
            return { view_count: order };
          case "relevance":
          default:
            return [{ title: "asc" }, { created_at: "desc" }];
        }
      })(),
      skip,
      take,
    }),
    MyGlobal.prisma.economic_discussion_articles.count({
      where: whereCondition,
    }),
  ]);

  const searchQueries: IEconomicDiscussionSearchQuery.ISummary[] = articles.map(
    (article) => {
      const memberId = article.economic_discussion_member_id;
      const moderatorId = article.economic_discussion_moderator_id;

      return {
        articles: [
          {
            id: article.id,
            title: article.title,
            view_count: article.view_count,
            created_at: toISOStringSafe(article.created_at),
            updated_at: toISOStringSafe(article.updated_at),
            economic_discussion_member_id: memberId
              ? (memberId satisfies string as string & tags.Format<"uuid">)
              : (null as any),
            economic_discussion_moderator_id: moderatorId
              ? (moderatorId satisfies string as string & tags.Format<"uuid">)
              : (null as any),
            ...(memberId && {
              member_author: {
                id: memberId satisfies string as string & tags.Format<"uuid">,
                username: "unknown",
                email_verified: false,
                reputation_score: 0,
                created_at: toISOStringSafe(new Date()),
              },
            }),
            ...(moderatorId && {
              moderator_author: {
                id: moderatorId satisfies string as string &
                  tags.Format<"uuid">,
                username: "unknown",
                moderation_level: "standard",
                created_at: toISOStringSafe(new Date()),
              },
            }),
            categories: [],
            attachments_count: 0,
            comments_count: 0,
            status: article.status as "pending" | "approved" | "rejected",
          },
        ],
        total_count: 1,
        search_metadata: {
          query: query satisfies string as string,
          filters:
            categoryIds.length > 0
              ? { categories: categoryIds.join(",") }
              : ({} as IEconomicDiscussionSearchFilters),
          sort_order: (() => {
            switch (sort_by) {
              case "created_at":
                return order === "asc" ? "date_asc" : "date_desc";
              case "updated_at":
                return order === "asc" ? "date_asc" : "date_desc";
              case "view_count":
                return "views_desc";
              case "relevance":
              default:
                return "relevance" as const;
            }
          })(),
          execution_time_ms: Date.now() - startTime,
          performed_at: toISOStringSafe(new Date()),
          scope: scope satisfies "member" | "moderator" | "all" as
            | "member"
            | "moderator"
            | "all",
        },
      };
    },
  );

  const totalPages = Math.ceil(total / limit);

  return {
    data: searchQueries,
    pagination: {
      current: page - 1,
      pages: totalPages,
      limit,
      records: total,
    },
  };
}
