import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorCommentsCommentIdRepliesReplyId(props: {
  moderator: ModeratorPayload;
  commentId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, commentId, replyId } = props;

  // Validate moderator
  if (!moderator || moderator.type !== "moderator") {
    throw new HttpException("Unauthorized", 401);
  }

  // Check if reply exists and belongs to the comment
  const reply =
    await MyGlobal.prisma.discussion_board_comment_replies.findFirst({
      where: { id: replyId, comment: { id: commentId } },
    });

  if (!reply) {
    throw new HttpException("Reply not found", 404);
  }

  // Delete the reply
  await MyGlobal.prisma.discussion_board_comment_replies.delete({
    where: { id: replyId },
  });
}
