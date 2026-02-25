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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardGuestSearchArticles(props: {
  guest: GuestPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const body = props.body;
  const page = body.page && body.page >= 1 ? body.page : 1;
  const limit =
    body.limit && body.limit >= 1 && body.limit <= 100 ? body.limit : 20;
  const skip = (page - 1) * limit;
  const where: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
  };
  if (body.search && body.search.trim().length > 0) {
    where.OR = [
      { title: { contains: body.search.trim(), mode: "insensitive" } },
      { content: { contains: body.search.trim(), mode: "insensitive" } },
    ];
  }
  if (body.sectionId) {
    where.section_id = body.sectionId;
  }
  if (body.tags && Array.isArray(body.tags) && body.tags.length > 0) {
    where.AND = [
      {
        articleTags: {
          every: {
            discussion_board_tag_id: { in: body.tags },
          },
        },
      },
    ];
  }
  const orderBy: Prisma.discussion_board_articlesOrderByWithRelationInput =
    body.sort === "oldest" ? { created_at: "asc" } : { created_at: "desc" };
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where,
  });
  const results = await MyGlobal.prisma.discussion_board_articles.findMany({
    where,
    skip,
    take: limit,
    orderBy,
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
      comment_count: true,
      articleTags: {
        select: {
          discussion_board_tag_id: true,
          discussion_board_article_id: true,
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
  const data: IDiscussionBoardArticle.ISummary[] = await Promise.all(
    results.map(async (article) => ({
      id: article.id as string & tags.Format<"uuid">,
      title: article.title,
      author: {
        id: article.registered_user.id as string & tags.Format<"uuid">,
        email: article.registered_user.email,
        displayName: article.registered_user.display_name,
        bio: article.registered_user.bio ?? null,
        isBanned: article.registered_user.is_banned,
        createdAt:
          toISOStringSafe(article.registered_user.created_at) ??
          ("" as string & tags.Format<"date-time">),
        updatedAt:
          toISOStringSafe(article.registered_user.updated_at) ??
          ("" as string & tags.Format<"date-time">),
        deletedAt: article.registered_user.deleted_at
          ? toISOStringSafe(article.registered_user.deleted_at)
          : null,
      } satisfies IDiscussionBoardRegisteredUser.ISummary,
      section: {
        id: article.section.id as string & tags.Format<"uuid">,
        name: article.section.name,
        description: article.section.description,
        createdAt:
          toISOStringSafe(article.section.created_at) ??
          ("" as string & tags.Format<"date-time">),
        updatedAt:
          toISOStringSafe(article.section.updated_at) ??
          ("" as string & tags.Format<"date-time">),
        deletedAt: article.section.deleted_at
          ? toISOStringSafe(article.section.deleted_at)
          : null,
      } satisfies IDiscussionBoardSection.ISummary,
      commentCount: article.comment_count satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      tags: await ArrayUtil.asyncMap(
        article.articleTags,
        async (at) =>
          ({
            discussionBoardTagId: at.discussion_board_tag_id as string &
              tags.Format<"uuid">,
            discussionBoardArticleId: at.discussion_board_article_id as string &
              tags.Format<"uuid">,
            id: at.tag.id as string & tags.Format<"uuid">,
            name: at.tag.name,
            createdAt: "0001-01-01T00:00:00.000Z" as string &
              tags.Format<"date-time">,
            updatedAt: "0001-01-01T00:00:00.000Z" as string &
              tags.Format<"date-time">,
            deletedAt: null,
          }) satisfies IDiscussionBoardArticleTag.ISummary,
      ),
      createdAt:
        toISOStringSafe(article.created_at) ??
        ("" as string & tags.Format<"date-time">),
    })),
  );
  return {
    data,
    pagination: {
      current: page satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: limit satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100> as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      records: total satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardArticle.ISummary;
}
