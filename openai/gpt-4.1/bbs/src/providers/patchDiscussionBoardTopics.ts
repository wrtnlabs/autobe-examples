import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import { IPageIDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTopic";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardTopics(props: {
  body: IDiscussionBoardTopic.IRequest;
}): Promise<IPageIDiscussionBoardTopic.ISummary> {
  const body = props.body;
  const page =
    body.page !== undefined && body.page !== null && body.page >= 1
      ? body.page
      : 1;
  const limitRaw =
    body.limit !== undefined && body.limit !== null ? body.limit : 20;
  const limit = limitRaw > 100 ? 100 : limitRaw;
  const skip = (page - 1) * limit;

  // created_at filter (merge after and before)
  let createdAtFilter:
    | {
        gte?: string & tags.Format<"date-time">;
        lte?: string & tags.Format<"date-time">;
      }
    | undefined = undefined;
  if (
    body.after !== undefined &&
    body.after !== null &&
    body.before !== undefined &&
    body.before !== null
  ) {
    createdAtFilter = { gte: body.after, lte: body.before };
  } else if (body.after !== undefined && body.after !== null) {
    createdAtFilter = { gte: body.after };
  } else if (body.before !== undefined && body.before !== null) {
    createdAtFilter = { lte: body.before };
  }

  // Build where clause
  const where = {
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search !== "" && {
        OR: [
          { subject: { contains: body.search } },
          { content: { contains: body.search } },
        ],
      }),
    ...(body.author_member_id !== undefined &&
      body.author_member_id !== null && {
        author_member_id: body.author_member_id,
      }),
    ...(body.author_admin_id !== undefined &&
      body.author_admin_id !== null && {
        author_admin_id: body.author_admin_id,
      }),
    ...(createdAtFilter && { created_at: createdAtFilter }),
  };

  // sort_by and sort_order
  const allowedSortBy = ["created_at", "updated_at"];
  const sort_by =
    allowedSortBy.indexOf(body.sort_by ?? "") !== -1
      ? body.sort_by!
      : "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_topics.findMany({
      where,
      orderBy: { [sort_by]: sort_order },
      skip,
      take: limit,
      select: {
        id: true,
        subject: true,
        author_member_id: true,
        author_admin_id: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_topics.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      subject: row.subject,
      author_member_id: row.author_member_id ?? undefined,
      author_admin_id: row.author_admin_id ?? undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
