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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorArticles(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const validPage = page < 1 ? 1 : page;
  const validLimit = limit < 1 ? 1 : limit > 100 ? 100 : limit;
  const skip = (validPage - 1) * validLimit;
  const andConditions: Prisma.discussion_board_articlesWhereInput[] = [];
  if (props.body.search && props.body.search.trim().length > 0) {
    andConditions.push({
      OR: [
        { title: { contains: props.body.search.trim(), mode: "insensitive" } },
        {
          content: { contains: props.body.search.trim(), mode: "insensitive" },
        },
      ],
    });
  }
  if (props.body.sectionId) {
    andConditions.push({ section_id: props.body.sectionId });
  }
  if (props.body.tags && props.body.tags.length > 0) {
    for (const tagId of props.body.tags) {
      andConditions.push({
        discussion_board_article_tag_mappings: {
          some: {
            discussion_board_tag_id: tagId,
            deleted_at: null,
          },
        },
      });
    }
  }
  const where: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
    AND: andConditions.length > 0 ? andConditions : undefined,
  };
  const orderBy: Prisma.discussion_board_articlesOrderByWithRelationInput =
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: where,
  });
  const articles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: where,
    skip: skip,
    take: validLimit,
    orderBy: orderBy,
    select: {
      id: true,
      title: true,
      content: true,
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
      discussion_board_article_tag_mappings: {
        where: { deleted_at: null },
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
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
      discussion_board_comments: {
        where: { deleted_at: null },
        select: { id: true },
      },
      created_at: true,
    },
  });
  const data: IPageIDiscussionBoardArticle.ISummary["data"] = articles.map(
    (article): IDiscussionBoardArticle.ISummary => {
      const author = article.registered_user!;
      const section = article.section!;
      const tags = article.discussion_board_article_tag_mappings
        .map(
          (mapping: { tag: IDiscussionBoardArticleTag.ISummary | null }) =>
            mapping.tag!,
        )
        .filter(
          (tag: IDiscussionBoardArticleTag.ISummary) =>
            tag.deletedAt === null || tag.deletedAt === undefined,
        );
      return {
        id: article.id,
        title: article.title,
        author: {
          id: author.id,
          email: author.email,
          displayName: author.display_name,
          bio: author.bio ?? null,
          isBanned: author.is_banned,
          createdAt: toISOStringSafe(author.created_at ?? null),
          updatedAt: toISOStringSafe(author.updated_at ?? null),
          deletedAt: toISOStringSafe(author.deleted_at ?? null),
        },
        section: {
          id: section.id,
          name: section.name,
          description: section.description,
          createdAt: toISOStringSafe(section.created_at ?? null),
          updatedAt: toISOStringSafe(section.updated_at ?? null),
          deletedAt: toISOStringSafe(section.deleted_at ?? null),
        },
        commentCount: article.discussion_board_comments.length,
        tags: tags.map((tag: IDiscussionBoardArticleTag.ISummary) => ({
          id: tag.id,
          name: tag.name,
          createdAt: toISOStringSafe(tag.createdAt ?? null),
          updatedAt: toISOStringSafe(tag.updatedAt ?? null),
          deletedAt: toISOStringSafe(tag.deletedAt ?? null),
        })),
        createdAt: toISOStringSafe(article.created_at ?? null),
      };
    },
  );
  return {
    pagination: {
      current: validPage,
      limit: validLimit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / validLimit),
    },
    data,
  };
}
