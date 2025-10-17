import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIEconDiscussLiveMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussLiveMessage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconDiscussLiveMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussLiveMessage";
import { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";
import { IELiveMessageType } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveMessageType";

export async function getEconDiscussPostsPostIdLiveMessages(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IPageIEconDiscussLiveMessage> {
  const { postId } = props;

  const thread = await MyGlobal.prisma.econ_discuss_live_threads.findFirst({
    where: {
      econ_discuss_post_id: postId,
      deleted_at: null,
    },
    select: {
      id: true,
      access_scope: true,
    },
  });

  if (!thread) throw new HttpException("Not Found", 404);
  if (thread.access_scope !== "public")
    throw new HttpException("Forbidden", 403);

  const page = 1;
  const limit = 20;
  const skip = (Number(page) - 1) * Number(limit);

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_live_messages.findMany({
      where: {
        econ_discuss_live_thread_id: thread.id,
        deleted_at: null,
      },
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
      },
      orderBy: { created_at: "desc" },
      skip,
      take: Number(limit),
    }),
    MyGlobal.prisma.econ_discuss_live_messages.count({
      where: {
        econ_discuss_live_thread_id: thread.id,
        deleted_at: null,
      },
    }),
  ]);

  const data: IEconDiscussLiveMessage[] = rows.map((m) => ({
    id: m.id,
    liveThreadId: m.econ_discuss_live_thread_id,
    authorUserId:
      m.econ_discuss_user_id === null ? null : m.econ_discuss_user_id,
    messageType: m.message_type as IELiveMessageType,
    content: m.content ?? null,
    pinned: m.pinned,
    editedAt: m.edited_at ? toISOStringSafe(m.edited_at) : null,
    createdAt: toISOStringSafe(m.created_at),
    updatedAt: toISOStringSafe(m.updated_at),
  }));

  const pages = Math.ceil(total / Number(limit));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(pages),
    },
    data,
  };
}
