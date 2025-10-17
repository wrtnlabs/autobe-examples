import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import { IPageIDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReply";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardTopicsTopicIdReplies(props: {
  topicId: string & tags.Format<"uuid">;
  body: IDiscussionBoardReply.IRequest;
}): Promise<IPageIDiscussionBoardReply.ISummary> {
  const { topicId, body } = props;
  // 1. Verify topic existence
  const topic = await MyGlobal.prisma.discussion_board_topics.findUnique({
    where: { id: topicId },
    select: { id: true },
  });
  if (!topic) throw new HttpException("Topic not found", 404);

  // 2. Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 3. Build where clause (never use contains on UUID fields)
  const where = {
    topic_id: topicId,
    ...(body.author_member_id !== undefined &&
      body.author_member_id !== null && {
        author_member_id: body.author_member_id,
      }),
    ...(body.author_admin_id !== undefined &&
      body.author_admin_id !== null && {
        author_admin_id: body.author_admin_id,
      }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.length !== 0 && {
        content: { contains: body.search },
      }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && {
                gte: body.created_from,
              }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && {
                lte: body.created_to,
              }),
          },
        }
      : {}),
  };

  // 4. Order by (inline only)
  const sortField = body.sort === "updated_at" ? "updated_at" : "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";
  const orderBy = [{ [sortField]: sortOrder }];

  // 5. Query rows and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_replies.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        topic_id: true,
        author_member_id: true,
        author_admin_id: true,
        content: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_replies.count({ where }),
  ]);

  // 6. Map to ISummary (handle null vs undefined)
  const data = rows.map((reply) => ({
    id: reply.id,
    topic_id: reply.topic_id,
    author_member_id:
      reply.author_member_id === null ? undefined : reply.author_member_id,
    author_admin_id:
      reply.author_admin_id === null ? undefined : reply.author_admin_id,
    content: reply.content,
    created_at: toISOStringSafe(reply.created_at),
    updated_at: toISOStringSafe(reply.updated_at),
  }));

  // 7. Pagination info
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
