import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMemberTopicsTopicIdRepliesReplyId(props: {
  member: MemberPayload;
  topicId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
  body: IDiscussionBoardReply.IUpdate;
}): Promise<IDiscussionBoardReply> {
  const { member, topicId, replyId, body } = props;
  // Step 1: Find the reply, must match topic and reply id.
  const reply = await MyGlobal.prisma.discussion_board_replies.findFirst({
    where: {
      id: replyId,
      topic_id: topicId,
    },
  });
  if (!reply) {
    throw new HttpException("Reply not found", 404);
  }
  // Step 2: Only the author member can update their own reply
  if (reply.author_member_id !== member.id) {
    throw new HttpException("You are not the author of this reply", 403);
  }
  // Step 3: Update only content (and updated_at)
  const updated = await MyGlobal.prisma.discussion_board_replies.update({
    where: { id: replyId },
    data: {
      content: body.content !== undefined ? body.content : reply.content,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Step 4: Return updated DTO (all fields, date fields as string)
  return {
    id: updated.id,
    topic_id: updated.topic_id,
    author_member_id: updated.author_member_id ?? undefined,
    author_admin_id: updated.author_admin_id ?? undefined,
    content: updated.content,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
