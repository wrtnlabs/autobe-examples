import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

export async function getCommunityPlatformPostsPostIdCommentsCommentId(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformComment> {
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: {
      id: props.commentId,
      community_platform_post_id: props.postId,
      status: "published",
      deleted_at: null,
    },
  });
  if (!comment)
    throw new HttpException("Comment not found or not viewable", 404);
  return {
    id: comment.id,
    community_platform_post_id: comment.community_platform_post_id,
    community_platform_member_id: comment.community_platform_member_id,
    parent_id: comment.parent_id ?? null,
    body: comment.body,
    nesting_level: comment.nesting_level,
    status: comment.status,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
  };
}
