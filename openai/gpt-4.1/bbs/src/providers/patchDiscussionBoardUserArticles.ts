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
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchDiscussionBoardUserArticles(props: {
  user: UserPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const { body } = props;
  // Pagination defaults (ensure bounds per DTO)
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Compose where clause dynamically, including only defined filters
  const where: Record<string, any> = { deleted_at: null };
  if (body.q !== undefined && body.q !== null && body.q !== "") {
    where.OR = [
      { title: { contains: body.q } },
      { body: { contains: body.q } },
    ];
  }
  if (body.author_user_id !== undefined && body.author_user_id !== null) {
    where.author_user_id = body.author_user_id;
  }
  if (body.created_from !== undefined && body.created_from !== null) {
    where.created_at = { ...where.created_at, gte: body.created_from };
  }
  if (body.created_to !== undefined && body.created_to !== null) {
    where.created_at = { ...where.created_at, lte: body.created_to };
  }
  if (body.updated_from !== undefined && body.updated_from !== null) {
    where.updated_at = { ...where.updated_at, gte: body.updated_from };
  }
  if (body.updated_to !== undefined && body.updated_to !== null) {
    where.updated_at = { ...where.updated_at, lte: body.updated_to };
  }

  // Determine sorting
  const sortByField = body.sort_by ?? "created_at";
  const validSortFields = ["created_at", "updated_at", "title", "author"];
  const field = validSortFields.includes(sortByField)
    ? sortByField
    : "created_at";
  let orderBy: Record<string, any>;
  if (field === "author") {
    orderBy = { author_user_id: body.order ?? "desc" };
  } else {
    orderBy = { [field]: body.order ?? "desc" };
  }

  // Query rows and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_articles.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        author_user_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_articles.count({ where }),
  ]);

  // Get map of all author users referenced
  const authorIds = Array.from(new Set(rows.map((row) => row.author_user_id)));
  const authors = await MyGlobal.prisma.discussion_board_users.findMany({
    where: {
      id: { in: authorIds },
      deleted_at: null,
    },
    select: {
      id: true,
      display_name: true,
      avatar_url: true,
    },
  });
  const authorMap: Record<string, IDiscussionBoardUser.ISummary> = {};
  for (const a of authors) {
    authorMap[a.id] = {
      id: a.id,
      display_name: a.display_name,
      ...(a.avatar_url !== null && { avatar_url: a.avatar_url }),
    };
  }

  // Map result rows to response, ensuring created_at is string & Format<'date-time'>
  const data: IDiscussionBoardArticle.ISummary[] = rows.map((row) => {
    const author = authorMap[row.author_user_id];
    return {
      id: row.id,
      title: row.title,
      author,
      created_at: toISOStringSafe(row.created_at),
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
