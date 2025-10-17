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
import { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putEconDiscussMemberPostsPostIdLiveMessagesMessageId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  messageId: string & tags.Format<"uuid">;
  body: IEconDiscussLiveMessage.IUpdate;
}): Promise<IEconDiscussLiveMessage> {
  const { member, postId, messageId, body } = props;

  const thread = await MyGlobal.prisma.econ_discuss_live_threads.findFirst({
    where: {
      econ_discuss_post_id: postId,
      deleted_at: null,
    },
  });
  if (!thread) throw new HttpException("Live thread not found for postId", 404);

  const message = await MyGlobal.prisma.econ_discuss_live_messages.findFirst({
    where: {
      id: messageId,
      econ_discuss_live_thread_id: thread.id,
      deleted_at: null,
    },
  });
  if (!message)
    throw new HttpException(
      "Live message not found in the specified thread",
      404,
    );

  if (thread.state === "ended" || thread.state === "archived") {
    throw new HttpException(
      "Live thread is not editable in its current state",
      409,
    );
  }

  const isAuthor =
    message.econ_discuss_user_id !== null &&
    message.econ_discuss_user_id === member.id;
  const isHost = thread.host_user_id === member.id;
  const [moderator, admin] = await Promise.all([
    MyGlobal.prisma.econ_discuss_moderators.findFirst({
      where: { user_id: member.id, deleted_at: null },
    }),
    MyGlobal.prisma.econ_discuss_admins.findFirst({
      where: { user_id: member.id, deleted_at: null },
    }),
  ]);
  const isElevated = Boolean(moderator || admin || isHost);

  const wantsContent = body.content !== undefined; // null allowed to clear
  const wantsPinned = body.pinned !== undefined && body.pinned !== null; // null => skip
  const wantsType = body.messageType !== undefined && body.messageType !== null; // null => skip

  if (!wantsContent && !wantsPinned && !wantsType) {
    throw new HttpException("No updatable fields provided", 400);
  }

  if (wantsPinned && !isElevated) {
    throw new HttpException(
      "Forbidden: Only host or moderators can toggle pinned",
      403,
    );
  }
  if (wantsType && !isElevated) {
    throw new HttpException(
      "Forbidden: Only host or moderators can change message type",
      403,
    );
  }
  if (wantsContent && !(isAuthor || isElevated)) {
    throw new HttpException(
      "Forbidden: Only the author or elevated roles can edit content",
      403,
    );
  }

  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.econ_discuss_live_messages.update({
    where: { id: messageId },
    data: {
      content: wantsContent ? (body.content ?? null) : undefined,
      pinned: wantsPinned ? (body.pinned ?? undefined) : undefined,
      message_type: wantsType
        ? (body.messageType as IELiveMessageType)
        : undefined,
      edited_at: now,
      updated_at: now,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    liveThreadId: thread.id as string & tags.Format<"uuid">,
    authorUserId:
      updated.econ_discuss_user_id === null
        ? null
        : (updated.econ_discuss_user_id as string & tags.Format<"uuid">),
    author: undefined,
    messageType: updated.message_type as IELiveMessageType,
    content: updated.content ?? null,
    pinned: updated.pinned,
    editedAt: now,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: now,
    deletedAt: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
