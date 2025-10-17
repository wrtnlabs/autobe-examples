import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminTopicsTopicIdRepliesReplyId(props: {
  admin: AdminPayload;
  topicId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
  body: IDiscussionBoardReply.IUpdate;
}): Promise<IDiscussionBoardReply> {
  // Fetch reply and ensure it belongs to correct topic
  const reply = await MyGlobal.prisma.discussion_board_replies.findUnique({
    where: { id: props.replyId },
  });
  if (!reply || reply.topic_id !== props.topicId) {
    throw new HttpException("Reply not found in specified topic", 404);
  }
  // All admins are allowed to update any reply content per business rules
  // Prepare updated_at once
  const now = toISOStringSafe(new Date());
  // Only update content if provided
  const updated = await MyGlobal.prisma.discussion_board_replies.update({
    where: { id: props.replyId },
    data: {
      ...(props.body.content !== undefined
        ? { content: props.body.content }
        : {}),
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    topic_id: updated.topic_id,
    author_member_id:
      updated.author_member_id === null ? null : updated.author_member_id,
    author_admin_id:
      updated.author_admin_id === null ? null : updated.author_admin_id,
    content: updated.content,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
