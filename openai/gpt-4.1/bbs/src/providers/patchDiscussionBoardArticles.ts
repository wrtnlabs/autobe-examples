import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function patchDiscussionBoardArticles(props: {
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const {
    title,
    author_user_id,
    created_from,
    created_to,
    sort_by = "created_at",
    sort_direction = "desc",
    page = 1,
    limit = 20,
    include_deleted,
  } = props.body;

  const take = limit;
  const skip = (page - 1) * limit;

  // Build created_at filter step-wise to avoid referencing 'where' before declaration
  let createdAtFilter: Record<string, string> | undefined = undefined;
  if (created_from !== undefined && created_to !== undefined) {
    createdAtFilter = { gte: created_from, lte: created_to };
  } else if (created_from !== undefined) {
    createdAtFilter = { gte: created_from };
  } else if (created_to !== undefined) {
    createdAtFilter = { lte: created_to };
  }

  const where: Record<string, unknown> = {
    ...(title !== undefined && {
      title: { contains: title, mode: "insensitive" },
    }),
    ...(author_user_id !== undefined && { user_id: author_user_id }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
    ...(include_deleted ? {} : { deleted_at: null }),
  };

  const allowedSortBy = ["created_at", "updated_at", "title"] as const;
  const allowedSortDirection = ["asc", "desc"] as const;
  const sortField = allowedSortBy.includes(sort_by) ? sort_by : "created_at";
  const sortDir = allowedSortDirection.includes(sort_direction)
    ? sort_direction
    : "desc";

  const [articles, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_articles.findMany({
      where,
      skip,
      take,
      orderBy: { [sortField]: sortDir },
      include: {
        user: true,
      },
    }),
    MyGlobal.prisma.discussion_board_articles.count({ where }),
  ]);

  const data = articles.map((article) => ({
    id: article.id,
    title: article.title,
    user: {
      id: article.user.id,
      email: article.user.email,
      created_at: toISOStringSafe(article.user.created_at),
      updated_at: toISOStringSafe(article.user.updated_at),
      deleted_at:
        article.user.deleted_at !== null &&
        article.user.deleted_at !== undefined
          ? toISOStringSafe(article.user.deleted_at)
          : undefined,
    },
    created_at: toISOStringSafe(article.created_at),
    updated_at:
      article.updated_at !== null && article.updated_at !== undefined
        ? toISOStringSafe(article.updated_at)
        : undefined,
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
