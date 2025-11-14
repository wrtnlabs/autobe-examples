import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumComment";

export async function getPoliticalForumCommentsCommentId(props: {
  commentId: string & tags.Format<"uuid">;
}): Promise<IPoliticalForumComment> {
  const comment = await MyGlobal.prisma.political_forum_comments.findUnique({
    where: { id: props.commentId },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  return typia.assert<IPoliticalForumComment>({
    id: comment.id,
    post_id: comment.post_id,
    citizen_id: comment.citizen_id,
    body: comment.body,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: comment.updated_at ? toISOStringSafe(comment.updated_at) : null,
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
  });
}
