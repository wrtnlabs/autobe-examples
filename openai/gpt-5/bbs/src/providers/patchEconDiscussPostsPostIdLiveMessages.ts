import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussLiveMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussLiveMessage";
import { IELiveMessageType } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveMessageType";
import { IPageIEconDiscussLiveMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussLiveMessage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";

export async function patchEconDiscussPostsPostIdLiveMessages(props: {
  postId: string & tags.Format<"uuid">;
  body: IEconDiscussLiveMessage.IRequest;
}): Promise<IPageIEconDiscussLiveMessage> {
  const { postId, body } = props;

  // Pagination defaults and validations
  const page = Number(body.page ?? 1);
  const pageSize = Number(body.pageSize ?? 20);
  if (!Number.isFinite(page) || page < 1) {
    throw new HttpException("Bad Request: page must be >= 1", 400);
  }
  if (!Number.isFinite(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new HttpException(
      "Bad Request: pageSize must be between 1 and 100",
      400,
    );
  }
  const skip = (page - 1) * pageSize;

  // Ensure post exists
  await MyGlobal.prisma.econ_discuss_posts.findUniqueOrThrow({
    where: { id: postId },
    select: { id: true },
  });

  // Resolve live thread by post
  const thread = await MyGlobal.prisma.econ_discuss_live_threads.findUnique({
    where: { econ_discuss_post_id: postId },
    select: { id: true, expert_only: true, access_scope: true },
  });
  if (!thread) {
    throw new HttpException(
      "Not Found: live thread does not exist for the post",
      404,
    );
  }

  // Access control: only public & non-expert-only threads are readable without auth
  if (thread.expert_only === true || thread.access_scope !== "public") {
    throw new HttpException(
      "Forbidden: this live thread is not publicly visible",
      403,
    );
  }

  // Build where condition with optional filters
  const whereCondition = {
    econ_discuss_live_thread_id: thread.id,
    deleted_at: null,
    ...(body.pinned !== undefined && body.pinned !== null
      ? { pinned: body.pinned }
      : {}),
    ...(body.since !== undefined && body.since !== null
      ? { created_at: { gt: toISOStringSafe(body.since) } }
      : {}),
    ...(body.messageTypes !== undefined &&
    body.messageTypes !== null &&
    body.messageTypes.length > 0
      ? { message_type: { in: body.messageTypes } }
      : {}),
  };

  const sortBy = body.sortBy ?? "created_at_desc";
  const order: "asc" | "desc" = sortBy === "created_at_asc" ? "asc" : "desc";

  // Query count and data in parallel
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.econ_discuss_live_messages.count({ where: whereCondition }),
    MyGlobal.prisma.econ_discuss_live_messages.findMany({
      where: whereCondition,
      orderBy: { created_at: order },
      skip,
      take: pageSize,
      select: {
        id: true,
        econ_discuss_live_thread_id: true,
        econ_discuss_user_id: true,
        message_type: true,
        content: true,
        pinned: true,
        edited_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
  ]);

  const normalizeMessageType = (value: string): IELiveMessageType => {
    switch (value) {
      case "text":
      case "system":
      case "poll_prompt":
      case "poll_result":
      case "moderation_notice":
      case "pinned":
        return value;
      default:
        throw new HttpException(
          "Internal Server Error: invalid message_type in database",
          500,
        );
    }
  };

  const data: IEconDiscussLiveMessage[] = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    liveThreadId: r.econ_discuss_live_thread_id as string & tags.Format<"uuid">,
    authorUserId:
      r.econ_discuss_user_id === null
        ? null
        : (r.econ_discuss_user_id as string & tags.Format<"uuid">),
    messageType: normalizeMessageType(r.message_type),
    content: r.content ?? null,
    pinned: r.pinned,
    editedAt: r.edited_at ? toISOStringSafe(r.edited_at) : null,
    createdAt: toISOStringSafe(r.created_at),
    updatedAt: toISOStringSafe(r.updated_at),
    deletedAt: null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data,
  };
}
