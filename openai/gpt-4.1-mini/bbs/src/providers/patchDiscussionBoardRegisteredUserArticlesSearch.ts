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

export async function patchDiscussionBoardRegisteredUserArticlesSearch(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = (() => {
    const p = props.body.page ?? 1;
    return p < 1 ? 1 : Math.floor(p);
  })();
  const limit = (() => {
    const l = props.body.limit ?? 20;
    if (l < 1) return 1;
    if (l > 100) return 100;
    return Math.floor(l);
  })();
  const skip = (page - 1) * limit;
  const baseWhere: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
  };
  if (props.body.search && props.body.search.trim()) {
    baseWhere.AND = [
      {
        OR: [
          { title: { contains: props.body.search, mode: "insensitive" } },
          { content: { contains: props.body.search, mode: "insensitive" } },
        ],
      },
    ];
  }
  if (props.body.sectionId) {
    baseWhere.section_id = props.body.sectionId;
  }
  if (props.body.tags && props.body.tags.length > 0) {
    baseWhere.AND = baseWhere.AND ?? [];
    if (!Array.isArray(baseWhere.AND)) {
      baseWhere.AND = [baseWhere.AND];
    }
    for (const tagId of props.body.tags) {
      (baseWhere.AND as Prisma.discussion_board_articlesWhereInput[]).push({
        articleTags: {
          some: {
            discussion_board_tag_id: tagId,
            deleted_at: null,
          },
        },
      });
    }
  }
  const orderBy: Prisma.discussion_board_articlesOrderByWithRelationInput =
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  const articles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: baseWhere,
    skip,
    take: limit,
    orderBy,
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
      articleTags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          discussion_board_article_id: true,
          discussion_board_tag_id: true,
        },
      },
      comments: {
        where: { deleted_at: null },
        select: { id: true },
      },
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: baseWhere,
  });
  const data: IDiscussionBoardArticle.ISummary[] = articles.map((article) => ({
    id: article.id,
    title: article.title,
    author: {
      id: article.author.id,
      email: article.author.email,
      displayName: article.author.display_name,
      bio: article.author.bio ?? null,
      isBanned: article.author.is_banned,
      createdAt: toISOStringSafe(article.author.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(article.author.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt: article.author.deleted_at
        ? toISOStringSafe(article.author.deleted_at)
        : null,
    },
    section: {
      id: article.section.id,
      name: article.section.name,
      description: article.section.description,
      createdAt: toISOStringSafe(article.section.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(article.section.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt: article.section.deleted_at
        ? toISOStringSafe(article.section.deleted_at)
        : null,
    },
    commentCount: article.comments.length,
    tags: article.articleTags.map((at) => ({
      discussionBoardArticleId: at.discussion_board_article_id,
      discussionBoardTagId: at.discussion_board_tag_id,
      id: at.tag.id,
      name: at.tag.name,
      description: null,
      createdAt: toISOStringSafe(at.tag.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(at.tag.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt: at.tag.deleted_at ? toISOStringSafe(at.tag.deleted_at) : null,
    })),
    createdAt: toISOStringSafe(article.created_at) as string &
      tags.Format<"date-time">,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
