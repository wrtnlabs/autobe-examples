import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminTopicsTopicIdRepliesReplyId(props: {
  admin: AdminPayload;
  topicId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the reply by id
  const reply = await MyGlobal.prisma.discussion_board_replies.findUnique({
    where: { id: props.replyId },
    select: { id: true, topic_id: true },
  });
  if (!reply) throw new HttpException("Reply not found", 404);
  if (reply.topic_id !== props.topicId)
    throw new HttpException(
      "Reply does not belong to the specified topic",
      400,
    );
  // Admin can delete any reply
  await MyGlobal.prisma.discussion_board_replies.delete({
    where: { id: props.replyId },
  });
}
