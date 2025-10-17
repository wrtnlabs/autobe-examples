import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussLiveMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussLiveMessage";
import { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";
import { IELiveMessageType } from "@ORGANIZATION/PROJECT-api/lib/structures/IELiveMessageType";

export async function getEconDiscussPostsPostIdLiveMessagesMessageId(props: {
  postId: string & tags.Format<"uuid">;
  messageId: string & tags.Format<"uuid">;
}): Promise<IEconDiscussLiveMessage> {
  const { postId, messageId } = props;

  const thread = await MyGlobal.prisma.econ_discuss_live_threads.findFirst({
    where: {
      econ_discuss_post_id: postId,
      deleted_at: null,
    },
    select: {
      id: true,
      access_scope: true,
      expert_only: true,
    },
  });
  if (!thread) throw new HttpException("Not Found", 404);

  if (thread.access_scope !== "public" || thread.expert_only === true) {
    throw new HttpException("Forbidden", 403);
  }

  const message = await MyGlobal.prisma.econ_discuss_live_messages.findFirst({
    where: {
      id: messageId,
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
      deleted_at: true,
    },
  });
  if (!message) throw new HttpException("Not Found", 404);

  return {
    id: message.id as string & tags.Format<"uuid">,
    liveThreadId: message.econ_discuss_live_thread_id as string &
      tags.Format<"uuid">,
    authorUserId:
      message.econ_discuss_user_id === null
        ? null
        : (message.econ_discuss_user_id as string & tags.Format<"uuid">),
    messageType: message.message_type as IELiveMessageType,
    content: message.content ?? null,
    pinned: message.pinned,
    editedAt: message.edited_at ? toISOStringSafe(message.edited_at) : null,
    createdAt: toISOStringSafe(message.created_at),
    updatedAt: toISOStringSafe(message.updated_at),
    deletedAt: message.deleted_at ? toISOStringSafe(message.deleted_at) : null,
  };
}
