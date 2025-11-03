import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardDiscussionBoardArticles(props: {
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const { body } = props;

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 10);
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.search_text !== undefined &&
      body.search_text !== null && {
        OR: [
          { title: { contains: body.search_text } },
          { content_markdown: { contains: body.search_text } },
        ],
      }),
  };

  // Safe casting of order to 'asc' | 'desc'
  const safeOrder: Prisma.SortOrder = body.order === "desc" ? "desc" : "asc";

  const orderBy: Prisma.discussion_board_articlesOrderByWithRelationInput =
    body.sort ? { [body.sort]: safeOrder } : { created_at: "desc" };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_articles.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_articles.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((article) => ({
      id: article.id,
      title: article.title,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      deleted_at: article.deleted_at
        ? toISOStringSafe(article.deleted_at)
        : null,
    })),
  };
}
