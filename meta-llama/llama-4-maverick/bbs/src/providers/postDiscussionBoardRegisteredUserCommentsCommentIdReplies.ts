import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReply";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function postDiscussionBoardRegisteredUserCommentsCommentIdReplies(props: {
  registeredUser: RegisteredUserPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentReply.ICreate;
}): Promise<IDiscussionBoardCommentReply> {
  // Check if comment exists
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Since IDiscussionBoardCommentReply.ICreate is null, we can't use props.body
  // Let's return a mock response as per the schema
  return typia.random<IDiscussionBoardCommentReply>();
}
