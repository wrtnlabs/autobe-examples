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

export async function patchDiscussionBoardSectionsSectionIdArticles(props: {
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const { limit, offset, sortBy, sortOrder } = props.body.pagination;
  const search = props.body.search?.trim();
  // Build where conditions
  const where: Prisma.discussion_board_articlesWhereInput = {
    section_id: props.sectionId,
    deleted_at: null,
  };
  // Add text search on title and content if provided
  if (search && search.length > 0) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
    ];
  }
  // Build order by clause
  const orderBy: Prisma.discussion_board_articlesOrderByWithRelationInput =
    sortBy === "createdAt"
      ? { created_at: sortOrder === "asc" ? "asc" : "desc" }
      : { title: sortOrder === "asc" ? "asc" : "desc" };
  // Fetch articles with pagination
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where,
    orderBy,
    skip: offset,
    take: limit,
    select: {
      id: true,
      title: true,
      content: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      section_id: true,
      author: {
        select: {
          id: true,
          created_at: true,
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
    },
  });
  // Count total matching records
  const count = await MyGlobal.prisma.discussion_board_articles.count({
    where,
  });
  // Transform data to DTO format
  const transformedData = data.map((article) => ({
    id: article.id,
    title: article.title,
    created_at: article.created_at.toISOString() satisfies string &
      tags.Format<"date-time">,
    updated_at: article.updated_at
      ? (article.updated_at.toISOString() satisfies string &
          tags.Format<"date-time">)
      : (null satisfies (string & tags.Format<"date-time">) | null),
    deleted_at: article.deleted_at
      ? (article.deleted_at.toISOString() satisfies string &
          tags.Format<"date-time">)
      : (null satisfies (string & tags.Format<"date-time">) | null),
    author: {
      id: article.author.id,
      session_token: "",
      created_at: article.author.created_at.toISOString() satisfies string &
        tags.Format<"date-time">,
    } satisfies IDiscussionBoardGuest.ISummary,
    section: {
      id: article.section.id,
      name: article.section.name,
      description: article.section.description,
      created_at: article.section.created_at.toISOString() satisfies string &
        tags.Format<"date-time">,
      updated_at: article.section.updated_at.toISOString() satisfies string &
        tags.Format<"date-time">,
      deleted_at: article.section.deleted_at
        ? (article.section.deleted_at.toISOString() satisfies string &
            tags.Format<"date-time">)
        : (null satisfies (string & tags.Format<"date-time">) | null),
      article_count: 0,
    } satisfies IDiscussionBoardSection.ISummary,
  }));
  return {
    pagination: {
      current: Math.floor(offset / limit) + 1,
      limit,
      records: count,
      pages: Math.ceil(count / limit),
    },
    data: transformedData,
  } satisfies IPageIDiscussionBoardArticle.ISummary;
}
