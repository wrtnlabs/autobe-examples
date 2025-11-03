import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsComment";

export async function getPoliticsBbsCommentsCommentId(props: {
  commentId: string & tags.Format<"uuid">;
}): Promise<IPoliticsBbsComment> {
  const comment = await MyGlobal.prisma.politics_bbs_comments.findFirst({
    where: {
      id: props.commentId,
      deleted_at: null,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  return {
    id: comment.id as string & tags.Format<"uuid">,
    politics_bbs_article_id: comment.politics_bbs_article_id,
    parent_id: comment.parent_id === null ? undefined : comment.parent_id,
    content: comment.content,
    depth: comment.depth as number & tags.Type<"int32">,
    status: comment.status,
    actor_type: comment.actor_type,
    created_at: comment.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: comment.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at:
      comment.deleted_at === null
        ? (null as (string & tags.Format<"date-time">) | null)
        : (comment.deleted_at.toISOString() as string &
            tags.Format<"date-time">),
  };
}
