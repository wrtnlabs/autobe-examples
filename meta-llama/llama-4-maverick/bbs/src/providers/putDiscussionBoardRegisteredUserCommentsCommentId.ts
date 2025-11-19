import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function putDiscussionBoardRegisteredUserCommentsCommentId(props: {
  registeredUser: RegisteredUserPayload;
  commentId: string;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  const existingComment =
    await MyGlobal.prisma.discussion_board_comments.findUnique({
      where: { id: props.commentId },
    });

  if (!existingComment) {
    throw new HttpException("Comment not found", 404);
  }

  if (existingComment.discussion_board_user_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content ?? existingComment.content,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    discussion_board_article_id: updated.discussion_board_article_id,
    discussion_board_user_id: updated.discussion_board_user_id,
    content: updated.content,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
