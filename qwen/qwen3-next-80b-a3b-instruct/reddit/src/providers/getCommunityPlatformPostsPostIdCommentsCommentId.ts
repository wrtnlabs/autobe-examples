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
  // Verify comment exists and belongs to the specified post with status 'published'
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        community_platform_post_id: props.postId,
        status: "published",
        deleted_at: null,
      },
    });

  // Return comment with all required fields, ensuring date fields are properly formatted strings
  return {
    id: comment.id,
    community_platform_post_id: comment.community_platform_post_id,
    author_id: comment.author_id,
    parent_comment_id: comment.parent_comment_id ?? undefined,
    parent_post_snapshot_id: comment.parent_post_snapshot_id ?? undefined,
    content: comment.content,
    vote_count: comment.vote_count,
    depth_level: comment.depth_level,
    status: typia.assert<"published" | "unreviewed" | "removed" | "archived">(
      comment.status,
    ),
    created_at: toISOStringSafe(comment.created_at),
    updated_at: comment.updated_at
      ? toISOStringSafe(comment.updated_at)
      : undefined,
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
  };
}
