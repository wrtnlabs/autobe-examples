import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardGuestArticlesTags(props: {
  guest: GuestPayload;
  body: IEconomicPoliticalBoardArticle.ITagSearch;
}): Promise<IPageIEconomicPoliticalBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sortBy = props.body.sortBy ?? "newest";
  const query = props.body.query;
  const sectionId = props.body.sectionId;
  const tagNameExact = props.body.tagNameExact;
  const tagNames = props.body.tagNames;
  const skip = (page - 1) * limit;
  // Build WHERE clause for articles
  const articleWhere: Prisma.economic_political_board_articlesWhereInput = {
    deleted_at: null,
    ...(sectionId && { section_id: sectionId }),
    ...(query && {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ],
    }),
  };
  // Tag filtering: tagNameExact AND tagNames (both must match if provided)
  const tagWhere: Prisma.economic_political_board_tagsWhereInput = {
    name: {
      in: tagNames ?? [],
    },
    deleted_at: null,
  };
  if (tagNameExact) {
    if (tagNames) {
      // Add exact name to the in array
      tagWhere.name = {
        in: [...(tagNames ?? []), tagNameExact],
      };
    } else {
      tagWhere.name = tagNameExact;
    }
  }
  // Get matching tag IDs
  let tagIds: string[] = [];
  if (tagWhere.name) {
    const matchingTags =
      await MyGlobal.prisma.economic_political_board_tags.findMany({
        where: tagWhere,
        select: { id: true },
      });
    tagIds = matchingTags.map((t) => t.id);
  }
  // Apply tag filter to articles if any tags match
  if (tagIds.length > 0) {
    articleWhere.articleTags = {
      some: {
        tag: {
          id: {
            in: tagIds,
          },
        },
      },
    };
  }
  // OrderBy
  const orderByInput: Prisma.economic_political_board_articlesOrderByWithRelationInput =
    sortBy === "popular"
      ? { created_at: "desc" }
      : sortBy === "oldest"
        ? { created_at: "asc" }
        : { created_at: "desc" };
  // Fetch articles with author
  const articles =
    await MyGlobal.prisma.economic_political_board_articles.findMany({
      where: articleWhere,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        created_at: true,
        author_id: true,
        author: {
          select: {
            id: true,
            grade: true,
            promoted_at: true,
            created_at: true,
            updated_at: true,
            promotedByUser: {
              select: {
                id: true,
                grade: true,
                promoted_at: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        },
      } satisfies Prisma.economic_political_board_articlesSelect,
    });
  // Get comment counts for all fetched articles
  const articleIds = articles.map((a) => a.id);
  const commentCounts =
    await MyGlobal.prisma.economic_political_board_comments.groupBy({
      by: ["article_id"],
      where: {
        article_id: {
          in: articleIds,
        },
        deleted_at: null,
      },
      _count: {
        article_id: true,
      },
    });
  const countMap = new Map(
    commentCounts.map((c) => [c.article_id, c._count.article_id]),
  );
  // Transform to response format
  const enrichedData = articles.map((article) => {
    const commentCount = countMap.get(article.id) ?? 0;
    const authorSummary: IEconomicPoliticalBoardAdministratorRole.ISummary = {
      id: article.author.id,
      grade: article.author.grade satisfies string as "regular" | "super",
      promoted_at: toISOStringSafe(article.author.promoted_at ?? new Date()),
      created_at: toISOStringSafe(article.author.created_at),
      updated_at: toISOStringSafe(article.author.updated_at),
      promoted_by_user: article.author.promotedByUser
        ? ({
            id: article.author.promotedByUser.id,
            grade: article.author.promotedByUser.grade satisfies string as
              | "regular"
              | "super",
            promoted_at: toISOStringSafe(
              article.author.promotedByUser.promoted_at ?? new Date(),
            ),
            created_at: toISOStringSafe(
              article.author.promotedByUser.created_at,
            ),
            updated_at: toISOStringSafe(
              article.author.promotedByUser.updated_at,
            ),
          } satisfies IEconomicPoliticalBoardAdministratorRole.ISummary)
        : null,
    };
    return {
      id: article.id as string & tags.Format<"uuid">,
      title: article.title,
      author: authorSummary,
      created_at: toISOStringSafe(article.created_at),
      comment_count: commentCount,
    } satisfies IEconomicPoliticalBoardArticle.ISummary;
  });
  const total = await MyGlobal.prisma.economic_political_board_articles.count({
    where: articleWhere,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: enrichedData,
  } satisfies IPageIEconomicPoliticalBoardArticle.ISummary;
}
