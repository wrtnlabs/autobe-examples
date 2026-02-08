import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminCommentsCommentId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformComment> {
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      content: true,
      is_deleted: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      parent_id: true,
      user_id: true,
      post_id: true,
    },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  function formatDate(
    value: Date | null | undefined,
  ): (string & tags.Format<"date-time">) | null {
    if (!value) return null;
    return toISOStringSafe(value);
  }
  return {
    id: comment.id,
    content: comment.content,
    is_deleted: comment.is_deleted,
    created_at: formatDate(comment.created_at)!,
    updated_at: formatDate(comment.updated_at)!,
    deleted_at: formatDate(comment.deleted_at),
    parent_id: comment.parent_id ?? null,
    author: null,
    post: null,
    parent_comment: null,
  };
}
