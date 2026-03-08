import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesSearch(props: {
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const { pagination, search, tags: tagNames, page, limit } = props.body;
  const take = limit ?? pagination.limit ?? 20;
  const currentPage = page ?? 1;
  const skip = (currentPage - 1) * take;
  const where: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(tagNames &&
      tagNames.length > 0 && {
        tags: {
          some: {
            name: { in: tagNames },
          },
        },
      }),
  };
  const orderBy: Prisma.discussion_board_articlesOrderByWithRelationInput =
    pagination.sortBy === "title"
      ? { title: pagination.sortOrder }
      : { created_at: pagination.sortOrder };
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where,
    orderBy,
    skip,
    take,
    select: {
      id: true,
      title: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      author_id: true,
      section_id: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where,
  });
  const mappedData = data.map((article) => ({
    id: article.id,
    title: article.title,
    created_at: toISOStringSafe(article.created_at),
    updated_at: article.updated_at ? toISOStringSafe(article.updated_at) : null,
    deleted_at: article.deleted_at ? toISOStringSafe(article.deleted_at) : null,
    author_id: article.author_id,
    section_id: article.section_id,
  }));
  const enrichedData = await Promise.all(
    mappedData.map(async (item) => {
      const author = await MyGlobal.prisma.discussion_board_guests.findUnique({
        where: { id: item.author_id },
        select: {
          id: true,
          created_at: true,
        },
      });
      const section =
        await MyGlobal.prisma.discussion_board_sections.findUnique({
          where: { id: item.section_id },
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        });
      const articleCount =
        await MyGlobal.prisma.discussion_board_articles.count({
          where: { section_id: item.section_id },
        });
      return {
        id: item.id,
        title: item.title,
        created_at: item.created_at,
        updated_at: item.updated_at,
        deleted_at: item.deleted_at,
        author: author
          ? {
              id: author.id,
              created_at: toISOStringSafe(author.created_at),
            }
          : null,
        section: section
          ? {
              id: section.id,
              name: section.name,
              description: section.description,
              created_at: toISOStringSafe(section.created_at),
              updated_at: toISOStringSafe(section.updated_at),
              deleted_at: section.deleted_at
                ? toISOStringSafe(section.deleted_at)
                : null,
              article_count: articleCount,
            }
          : null,
      };
    }),
  );
  return {
    data: typia.assert<IPageIDiscussionBoardArticle.ISummary["data"]>(
      enrichedData,
    ),
    pagination: {
      current: currentPage,
      limit: take,
      records: total,
      pages: Math.ceil(total / take) || 1,
    },
  };
}
