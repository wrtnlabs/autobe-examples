import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReply";

export async function getDiscussionBoardCommentsCommentIdRepliesReplyId(props: {
  commentId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentReply> {
  const reply =
    await MyGlobal.prisma.discussion_board_comment_replies.findUnique({
      where: {
        id: props.replyId,
        discussion_board_comment_id: props.commentId,
      },
    });

  if (!reply) {
    throw new HttpException("Reply not found", 404);
  }

  return typia.assert<IDiscussionBoardCommentReply>({
    id: reply.id,
    discussion_board_comment_id: reply.discussion_board_comment_id,
    discussion_board_user_id: reply.discussion_board_user_id,
    content: reply.content,
    created_at: toISOStringSafe(reply.created_at),
    updated_at: toISOStringSafe(reply.updated_at),
  });
}
