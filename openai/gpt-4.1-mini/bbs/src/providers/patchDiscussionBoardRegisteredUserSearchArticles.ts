import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUserSearchArticles(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const searchText = props.body.search?.trim();
  const tagsFilter = props.body.tags;
  const sectionFilter = props.body.sectionId;
  const sortOrder = props.body.sort === "oldest" ? "asc" : "desc";
  if (page < 1) {
    throw new HttpException(`Invalid page number: ${page}`, 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException(`Invalid limit: ${limit}`, 400);
  }
  const where: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
  };
  if (searchText) {
    where.OR = [
      { title: { contains: searchText, mode: "insensitive" } },
      { content: { contains: searchText, mode: "insensitive" } },
    ];
  }
  if (sectionFilter) {
    where.section_id = sectionFilter;
  }
  if (tagsFilter && tagsFilter.length > 0) {
    where.AND = tagsFilter.map((tagId) => ({
      tagMappings: {
        some: {
          discussion_board_tag_id: tagId,
          deleted_at: null,
        },
      },
    }));
  }
  const skip = (page - 1) * limit;
  const orderBy: Prisma.discussion_board_articlesOrderByWithRelationInput = {
    created_at: sortOrder,
  };
  // Remove 'description' from tag select
  const articles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      author: {
        select: {
          id: true,
          email: true,
          display_name: true,
          bio: true,
          is_banned: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      section: {
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      _count: {
        select: { articleTags: true },
      },
      articleTags: {
        select: {
          id: true,
          discussion_board_article_id: true,
          discussion_board_tag_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          tag: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where,
  });
  const data = await Promise.all(
    articles.map(async (article) => {
      // Due to Prisma typing issues, locally type article
      type Article = typeof article & {
        author: {
          id: string;
          email: string;
          display_name: string;
          bio: string | null;
          is_banned: boolean;
          created_at: Date;
          updated_at: Date;
          deleted_at: Date | null;
        };
        section: {
          id: string;
          name: string;
          description: string | null;
          created_at: Date;
          updated_at: Date;
          deleted_at: Date | null;
        };
        _count: {
          articleTags: number;
        };
        articleTags: {
          id: string;
          discussion_board_article_id: string;
          discussion_board_tag_id: string;
          created_at: Date;
          updated_at: Date;
          deleted_at: Date | null;
          tag: {
            id: string;
            name: string;
          };
        }[];
      };
      const art = article as Article;
      return {
        id: art.id,
        title: art.title,
        author: {
          id: art.author.id,
          email: art.author.email,
          displayName: art.author.display_name,
          bio: art.author.bio ?? null,
          isBanned: art.author.is_banned,
          createdAt: toISOStringSafe(art.author.created_at),
          updatedAt: toISOStringSafe(art.author.updated_at),
          deletedAt: art.author.deleted_at
            ? toISOStringSafe(art.author.deleted_at)
            : null,
        } satisfies IDiscussionBoardRegisteredUser.ISummary,
        section: {
          id: art.section.id,
          name: art.section.name,
          description: art.section.description,
          createdAt: toISOStringSafe(art.section.created_at),
          updatedAt: toISOStringSafe(art.section.updated_at),
          deletedAt: art.section.deleted_at
            ? toISOStringSafe(art.section.deleted_at)
            : null,
        } satisfies IDiscussionBoardSection.ISummary,
        commentCount: art._count.articleTags,
        tags: art.articleTags.map(
          (tag) =>
            ({
              id: tag.tag.id,
              discussionBoardArticleId: tag.discussion_board_article_id,
              discussionBoardTagId: tag.discussion_board_tag_id,
              createdAt: toISOStringSafe(tag.created_at),
              updatedAt: toISOStringSafe(tag.updated_at),
              deletedAt: tag.deleted_at
                ? toISOStringSafe(tag.deleted_at)
                : null,
            }) satisfies IDiscussionBoardArticleTag.ISummary,
        ),
        createdAt: toISOStringSafe(art.created_at),
      };
    }),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    },
    data,
  } satisfies IPageIDiscussionBoardArticle.ISummary;
}
