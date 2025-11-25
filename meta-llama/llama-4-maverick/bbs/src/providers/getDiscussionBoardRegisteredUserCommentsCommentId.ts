import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function getDiscussionBoardRegisteredUserCommentsCommentId(props: {
  registeredUser: RegisteredUserPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment> {
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  return {
    id: comment.id,
    content: comment.content,
    discussion_board_article_id: comment.discussion_board_article_id,
    discussion_board_user_id: comment.discussion_board_user_id,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
  };
}
