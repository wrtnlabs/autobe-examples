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

export async function putDiscussionBoardRegisteredUserCommentsCommentId(props: {
  registeredUser: RegistereduserPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  if (comment.discussion_board_registered_user_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const updateData: {
    content?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: now,
  };
  if ("content" in props.body && typeof props.body.content === "string") {
    updateData.content = props.body.content;
  }
  const updated = await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: updateData,
  });
  return {
    id: updated.id,
    content: updated.content,
    discussion_board_registered_user_id:
      updated.discussion_board_registered_user_id,
    discussion_board_article_id: updated.discussion_board_article_id,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    created_at: toISOStringSafe(updated.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updated.updated_at) as string &
      tags.Format<"date-time">,
  };
}
