import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardComments(props: {
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  const { body } = props;
  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  // Dynamic where filter for Prisma
  const where = {
    deleted_at: null as null,
    ...(body.article_id !== undefined && {
      discussion_board_article_id: body.article_id,
    }),
    ...(body.author_user_id !== undefined && {
      discussion_board_user_id: body.author_user_id,
    }),
    ...(body.author_admin_id !== undefined && {
      discussion_board_admin_id: body.author_admin_id,
    }),
    ...(body.content_keywords !== undefined &&
      body.content_keywords !== "" && {
        body: { contains: body.content_keywords },
      }),
    ...(body.created_from !== undefined && {
      created_at: Object.assign(
        {},
        body.created_from !== undefined ? { gte: body.created_from } : {},
        body.created_to !== undefined ? { lte: body.created_to } : {},
      ),
    }),
    ...(body.created_from === undefined &&
      body.created_to !== undefined && {
        created_at: { lte: body.created_to },
      }),
    ...(body.updated_from !== undefined && {
      updated_at: Object.assign(
        {},
        body.updated_from !== undefined ? { gte: body.updated_from } : {},
        body.updated_to !== undefined ? { lte: body.updated_to } : {},
      ),
    }),
    ...(body.updated_from === undefined &&
      body.updated_to !== undefined && {
        updated_at: { lte: body.updated_to },
      }),
  };

  let orderField: "created_at" | "updated_at" = "created_at";
  if (body.sort_by === "updated_at") orderField = "updated_at";
  let orderDirection: "asc" | "desc" = "desc";
  if (body.sort_direction === "asc") orderDirection = "asc";

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comments.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderField]: orderDirection },
    }),
    MyGlobal.prisma.discussion_board_comments.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: comments.map((c) => ({
      id: c.id,
      body: c.body,
      created_at: toISOStringSafe(c.created_at),
      updated_at: toISOStringSafe(c.updated_at),
      deleted_at:
        c.deleted_at !== null ? toISOStringSafe(c.deleted_at) : undefined,
    })),
  };
}
