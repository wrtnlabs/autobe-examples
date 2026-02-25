import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSearchIndex";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSearchIndex";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorArticleSearchIndexes(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardArticleSearchIndex.IRequest;
}): Promise<IPageIDiscussionBoardArticleSearchIndex.ISummary> {
  const pageNum = props.body.page ?? 1;
  const page = Math.max(1, pageNum) satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limitRaw = props.body.limit ?? 10;
  const limit = Math.min(Math.max(1, limitRaw), 100) satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;
  const sortOrder = props.body.sortOrder === "oldest" ? "asc" : "desc";
  const searchValue = props.body.search?.trim();
  const whereCondition: Prisma.discussion_board_article_search_indexesWhereInput =
    searchValue
      ? {
          deleted_at: null,
          OR: [
            { title: { contains: searchValue, mode: "insensitive" } },
            { body: { contains: searchValue, mode: "insensitive" } },
          ],
        }
      : { deleted_at: null };
  const orderBy = { created_at: sortOrder } as const;
  const searchIndexes =
    await MyGlobal.prisma.discussion_board_article_search_indexes.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        title: true,
        body: true,
        discussion_board_article_id: true,
        deleted_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.discussion_board_article_search_indexes.count({
      where: whereCondition,
    });
  const articleIds = searchIndexes.map((si) => si.discussion_board_article_id);
  const articles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: { id: { in: articleIds } },
    select: {
      id: true,
      title: true,
      registered_user: {
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
      comments: { select: { id: true } },
      article_tags: {
        select: {
          id: true,
          discussion_board_article_id: true,
          discussion_board_tag_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      created_at: true,
    },
  });
  const articleMap = new Map<string, (typeof articles)[0]>();
  for (const article of articles) {
    articleMap.set(article.id, article);
  }
  const transformedData = searchIndexes.map((item) => {
    const article = articleMap.get(item.discussion_board_article_id);
    if (!article) {
      throw new HttpException("Associated article not found", 500);
    }
    return {
      id: item.id,
      title: item.title,
      body: item.body,
      articleId: item.discussion_board_article_id as string &
        tags.Format<"uuid">,
      article: {
        id: article.id as string & tags.Format<"uuid">,
        title: article.title,
        author: {
          id: article.registered_user.id as string & tags.Format<"uuid">,
          email: article.registered_user.email,
          displayName: article.registered_user.display_name,
          bio: article.registered_user.bio ?? null,
          isBanned: article.registered_user.is_banned,
          createdAt: toISOStringSafe(article.registered_user.created_at),
          updatedAt: toISOStringSafe(article.registered_user.updated_at),
          deletedAt: article.registered_user.deleted_at
            ? toISOStringSafe(article.registered_user.deleted_at)
            : null,
        } satisfies IDiscussionBoardRegisteredUser.ISummary,
        section: {
          id: article.section.id as string & tags.Format<"uuid">,
          name: article.section.name,
          description: article.section.description,
          createdAt: toISOStringSafe(article.section.created_at),
          updatedAt: toISOStringSafe(article.section.updated_at),
          deletedAt: article.section.deleted_at
            ? toISOStringSafe(article.section.deleted_at)
            : null,
        } satisfies IDiscussionBoardSection.ISummary,
        commentCount: article.comments.length,
        tags: article.article_tags.map(
          (tag: {
            id: string & tags.Format<"uuid">;
            discussion_board_article_id: string & tags.Format<"uuid">;
            discussion_board_tag_id: string & tags.Format<"uuid">;
            created_at: Date;
            updated_at: Date;
            deleted_at: Date | null;
          }) => ({
            id: tag.id as string & tags.Format<"uuid">,
            discussionBoardArticleId:
              tag.discussion_board_article_id as string & tags.Format<"uuid">,
            discussionBoardTagId: tag.discussion_board_tag_id as string &
              tags.Format<"uuid">,
            createdAt: toISOStringSafe(tag.created_at),
            updatedAt: toISOStringSafe(tag.updated_at),
            deletedAt: tag.deleted_at ? toISOStringSafe(tag.deleted_at) : null,
          }),
        ),
        createdAt: toISOStringSafe(article.created_at),
      } satisfies IDiscussionBoardArticle.ISummary,
      tagMappingsCount: article.article_tags.length,
      deletedAt: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    };
  });
  return {
    data: transformedData,
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages:
        total === 0
          ? 0
          : (Math.ceil(total / limit) as number &
              tags.Type<"int32"> &
              tags.Minimum<0>),
    },
  };
}
