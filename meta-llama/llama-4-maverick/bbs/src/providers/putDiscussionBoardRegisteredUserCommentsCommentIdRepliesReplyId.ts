import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReply";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function putDiscussionBoardRegisteredUserCommentsCommentIdRepliesReplyId(props: {
  registeredUser: RegisteredUserPayload;
  commentId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentReply.IUpdate;
}): Promise<null> {
  const existingReply =
    await MyGlobal.prisma.discussion_board_comment_replies.findUnique({
      where: { id: props.replyId },
    });
  if (!existingReply) {
    throw new HttpException("Reply not found", 404);
  }
  if (existingReply.discussion_board_user_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.discussion_board_comment_replies.update({
    where: { id: props.replyId },
    data: { content: props.body },
  });
  return null;
}
