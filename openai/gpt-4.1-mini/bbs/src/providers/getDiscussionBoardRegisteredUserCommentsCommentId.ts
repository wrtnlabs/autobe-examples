import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardRegisteredUserCommentsCommentId(props: {
  registeredUser: RegistereduserPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment> {
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  const registeredUser =
    await MyGlobal.prisma.discussion_board_registered_users.findUnique({
      where: { id: comment.discussion_board_registered_user_id },
    });
  if (!registeredUser) {
    throw new HttpException("Registered user not found", 404);
  }
  return {
    id: comment.id,
    content: comment.content,
    discussion_board_registered_user_id:
      comment.discussion_board_registered_user_id,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: null,
    registered_user: {
      id: registeredUser.id,
      nickname: registeredUser.display_name,
      email: registeredUser.email,
      created_at: toISOStringSafe(registeredUser.created_at),
      updated_at: toISOStringSafe(registeredUser.updated_at),
    },
  };
}
