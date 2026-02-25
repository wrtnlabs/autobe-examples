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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdministratorArticles(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sort = props.body.sort ?? "newest";
  if (page < 1) throw new HttpException("Page must be at least 1", 400);
  if (limit < 1 || limit > 100)
    throw new HttpException("Limit must be between 1 and 100", 400);
  const whereConditions: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
  };
  if (props.body.search && props.body.search.trim() !== "") {
    whereConditions.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { content: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  if (props.body.sectionId) {
    whereConditions.section_id = props.body.sectionId;
  }
  if (props.body.tags && props.body.tags.length > 0) {
    whereConditions.AND = props.body.tags.map((tagId) => ({
      articleTags: {
        some: {
          discussion_board_tag_id: tagId,
          deleted_at: null,
        },
      },
    }));
  }
  const skip = (page - 1) * limit;
  const articles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: {
      created_at: sort === "newest" ? "desc" : "asc",
    },
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
      comments: {
        select: {
          id: true,
        },
      },
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereConditions,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: articles.map((article) => ({
      id: article.id as string & tags.Format<"uuid">,
      title: article.title,
      author: {
        id: article.author.id as string & tags.Format<"uuid">,
        email: article.author.email,
        displayName: article.author.display_name,
        bio: article.author.bio ?? null,
        isBanned: article.author.is_banned,
        createdAt: toISOStringSafe(article.author.created_at),
        updatedAt: toISOStringSafe(article.author.updated_at),
        deletedAt:
          article.author.deleted_at === null
            ? null
            : toISOStringSafe(article.author.deleted_at),
      },
      section: {
        id: article.section.id as string & tags.Format<"uuid">,
        name: article.section.name,
        description: article.section.description,
        createdAt: toISOStringSafe(article.section.created_at),
        updatedAt: toISOStringSafe(article.section.updated_at),
        deletedAt:
          article.section.deleted_at === null
            ? null
            : toISOStringSafe(article.section.deleted_at),
      },
      commentCount: article.comments.length,
      tags: article.articleTags.map((at) => ({
        id: at.tag.id as string & tags.Format<"uuid">,
        name: at.tag.name,
        discussionBoardArticleId: at.discussion_board_article_id as string &
          tags.Format<"uuid">,
        discussionBoardTagId: at.discussion_board_tag_id as string &
          tags.Format<"uuid">,
        createdAt: toISOStringSafe(at.created_at),
        updatedAt: toISOStringSafe(at.updated_at),
        deletedAt:
          at.deleted_at === null ? null : toISOStringSafe(at.deleted_at),
      })),
      createdAt: toISOStringSafe(article.created_at),
    })),
  };
}
