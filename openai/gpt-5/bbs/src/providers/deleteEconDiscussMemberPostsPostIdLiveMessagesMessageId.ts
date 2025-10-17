import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconDiscussMemberPostsPostIdLiveMessagesMessageId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  messageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId, messageId } = props;

  const message = await MyGlobal.prisma.econ_discuss_live_messages.findFirst({
    where: { id: messageId },
    select: {
      id: true,
      econ_discuss_user_id: true,
      deleted_at: true,
      thread: {
        select: {
          id: true,
          econ_discuss_post_id: true,
          host_user_id: true,
          state: true,
          archived_at: true,
          ended_at: true,
        },
      },
    },
  });

  if (!message) throw new HttpException("Not Found", 404);
  if (!message.thread || message.thread.econ_discuss_post_id !== postId)
    throw new HttpException("Not Found", 404);

  const isAuthor =
    message.econ_discuss_user_id !== null &&
    message.econ_discuss_user_id === member.id;
  const isHost = message.thread.host_user_id === member.id;

  let isGovernance = false;
  if (!isAuthor && !isHost) {
    const [moderator, admin] = await Promise.all([
      MyGlobal.prisma.econ_discuss_moderators.findFirst({
        where: {
          user_id: member.id,
          deleted_at: null,
          user: { is: { deleted_at: null } },
        },
      }),
      MyGlobal.prisma.econ_discuss_admins.findFirst({
        where: {
          user_id: member.id,
          deleted_at: null,
          user: { is: { deleted_at: null } },
        },
      }),
    ]);
    isGovernance = Boolean(moderator) || Boolean(admin);
  }

  if (!(isAuthor || isHost || isGovernance))
    throw new HttpException("Forbidden", 403);

  if (message.deleted_at !== null) return;

  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.econ_discuss_live_messages.update({
    where: { id: messageId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
