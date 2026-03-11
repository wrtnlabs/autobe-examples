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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardMemberArticlesTags(props: {
  member: MemberPayload;
  body: IEconomicPoliticalBoardArticle.ITagSearch;
}): Promise<IPageIEconomicPoliticalBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.economic_political_board_articlesWhereInput = {
    deleted_at: null,
    section: {
      deleted_at: null,
    },
  };
  // Section filter
  if (props.body.sectionId) {
    const section =
      await MyGlobal.prisma.economic_political_board_sections.findFirst({
        where: {
          id: props.body.sectionId,
          deleted_at: null,
        },
      });
    if (!section) {
      throw new HttpException("Section not found", 404);
    }
    whereConditions.section_id = props.body.sectionId;
  }
  // Tag filters
  if (props.body.tagNames || props.body.tagNameExact) {
    const tagFilter: Prisma.economic_political_board_article_tagsWhereInput = {
      tag: {
        deleted_at: null,
      },
    };
    if (props.body.tagNameExact) {
      const exactTag =
        await MyGlobal.prisma.economic_political_board_tags.findFirst({
          where: {
            name: props.body.tagNameExact,
            deleted_at: null,
          },
        });
      if (!exactTag) {
        return {
          data: [],
          pagination: {
            current: page,
            limit,
            records: 0,
            pages: 0,
          } satisfies IPage.IPagination,
        };
      }
      tagFilter.tag_id = exactTag.id;
    }
    if (props.body.tagNames && props.body.tagNames.length > 0) {
      const validTags =
        await MyGlobal.prisma.economic_political_board_tags.findMany({
          where: {
            name: { in: props.body.tagNames },
            deleted_at: null,
          },
        });
      if (validTags.length > 0) {
        tagFilter.tag_id = { in: validTags.map((t) => t.id) };
      } else if (props.body.tagNames.length > 0) {
        return {
          data: [],
          pagination: {
            current: page,
            limit,
            records: 0,
            pages: 0,
          } satisfies IPage.IPagination,
        };
      }
    }
    const taggedArticles =
      await MyGlobal.prisma.economic_political_board_article_tags.findMany({
        where: tagFilter,
        select: { article_id: true },
      });
    if (taggedArticles.length === 0) {
      return {
        data: [],
        pagination: {
          current: page,
          limit,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      };
    }
    whereConditions.id = { in: taggedArticles.map((a) => a.article_id) };
  }
  // Text search
  if (props.body.query) {
    const searchQuery = `%${props.body.query}%`;
    whereConditions.OR = [
      { title: { contains: searchQuery, mode: "insensitive" } },
      { content: { contains: searchQuery, mode: "insensitive" } },
    ];
  }
  const orderByInput = (() => {
    const sortBy = props.body.sortBy ?? "newest";
    switch (sortBy) {
      case "oldest":
        return { created_at: "asc" as const };
      case "popular":
        return {
          created_at: "desc" as const,
        } satisfies Prisma.economic_political_board_articlesOrderByWithRelationInput;
      default:
        return { created_at: "desc" as const };
    }
  })();
  if (props.body.sortBy === "popular") {
    const [articlesWithCount, total] = await Promise.all([
      MyGlobal.prisma.economic_political_board_articles.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy: [{ created_at: "desc" as const }, { id: "desc" as const }],
        select: {
          id: true,
          title: true,
          created_at: true,
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
          comments: {
            select: { deleted_at: true },
          },
        },
      }),
      MyGlobal.prisma.economic_political_board_articles.count({
        where: whereConditions,
      }),
    ]);
    return {
      data: await ArrayUtil.asyncMap(articlesWithCount, async (article) => {
        const author = article.author;
        const promotedByUser = author.promotedByUser;
        return {
          id: article.id,
          title: article.title,
          created_at: toISOStringSafe(article.created_at),
          author: {
            id: author.id,
            grade: typia.assert<"regular" | "super">(author.grade),
            promoted_at:
              author.promoted_at !== null
                ? toISOStringSafe(author.promoted_at)
                : null,
            created_at: toISOStringSafe(author.created_at),
            updated_at: toISOStringSafe(author.updated_at),
            promoted_by_user: promotedByUser
              ? {
                  id: promotedByUser.id,
                  grade: typia.assert<"regular" | "super">(
                    promotedByUser.grade,
                  ),
                  promoted_at:
                    promotedByUser.promoted_at !== null
                      ? toISOStringSafe(promotedByUser.promoted_at)
                      : null,
                  created_at: toISOStringSafe(promotedByUser.created_at),
                  updated_at: toISOStringSafe(promotedByUser.updated_at),
                }
              : null,
          },
          comment_count: article.comments.filter(
            (c: { deleted_at: Date | null }) => c.deleted_at === null,
          ).length,
        };
      }),
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    };
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.economic_political_board_articles.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        title: true,
        created_at: true,
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
        comments: {
          select: { deleted_at: true },
        },
      },
    }),
    MyGlobal.prisma.economic_political_board_articles.count({
      where: whereConditions,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(data, async (article) => {
      const author = article.author;
      const promotedByUser = author.promotedByUser;
      return {
        id: article.id,
        title: article.title,
        created_at: toISOStringSafe(article.created_at),
        author: {
          id: author.id,
          grade: typia.assert<"regular" | "super">(author.grade),
          promoted_at:
            author.promoted_at !== null
              ? toISOStringSafe(author.promoted_at)
              : null,
          created_at: toISOStringSafe(author.created_at),
          updated_at: toISOStringSafe(author.updated_at),
          promoted_by_user: promotedByUser
            ? {
                id: promotedByUser.id,
                grade: typia.assert<"regular" | "super">(promotedByUser.grade),
                promoted_at:
                  promotedByUser.promoted_at !== null
                    ? toISOStringSafe(promotedByUser.promoted_at)
                    : null,
                created_at: toISOStringSafe(promotedByUser.created_at),
                updated_at: toISOStringSafe(promotedByUser.updated_at),
              }
            : null,
        },
        comment_count: article.comments.filter(
          (c: { deleted_at: Date | null }) => c.deleted_at === null,
        ).length,
      };
    }),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
