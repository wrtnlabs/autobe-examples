import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberTopicsTopicIdRepliesReplyId(props: {
  member: MemberPayload;
  topicId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the reply (must exist, must belong to topic)
  const reply = await MyGlobal.prisma.discussion_board_replies.findFirst({
    where: {
      id: props.replyId,
      topic_id: props.topicId,
    },
    select: {
      id: true,
      author_member_id: true,
      author_admin_id: true,
    },
  });
  if (!reply) {
    throw new HttpException("Reply not found for this topic.", 404);
  }
  // Only the member who authored this reply can delete it (not admins)
  if (reply.author_member_id !== props.member.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own replies.",
      403,
    );
  }
  await MyGlobal.prisma.discussion_board_replies.delete({
    where: { id: props.replyId },
  });
}
