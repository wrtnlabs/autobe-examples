import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorCommentsCommentId(props: {
  administrator: AdministratorPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment> {
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      content: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      discussion_board_registered_user_id: true,
    },
  });
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  const user =
    await MyGlobal.prisma.discussion_board_registered_users.findUnique({
      where: { id: comment.discussion_board_registered_user_id },
      select: {
        id: true,
        email: true,
        display_name: true,
      },
    });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  return {
    id: comment.id,
    content: comment.content,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    author: {
      id: user.id,
      email: user.email,
      nickname: user.display_name,
    },
  };
}
