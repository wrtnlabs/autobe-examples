import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserCommentsCommentId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformComment> {
  // Fetch comment by id; must exist and not be hard deleted
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: {
      id: props.commentId,
    },
  });
  if (!comment || comment === null) {
    throw new HttpException("Comment not found", 404);
  }

  // Fetch post to verify community
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: comment.post_id,
      deleted_at: null,
    },
    select: {
      id: true,
      community_platform_community_id: true,
    },
  });
  if (!post || post === null) {
    throw new HttpException("Comment's post not found", 404);
  }

  // If comment is removed, enforce access control
  if (comment.is_removed) {
    // Permit if user is the comment author
    if (props.user.id !== comment.user_id) {
      // Otherwise, check if user is a member of this community
      const membership =
        await MyGlobal.prisma.community_platform_community_memberships.findFirst(
          {
            where: {
              community_platform_community_id:
                post.community_platform_community_id,
              community_platform_user_id: props.user.id,
            },
          },
        );
      if (!membership || membership === null) {
        throw new HttpException("Access denied for removed comment", 403);
      }
    }
  }

  // Compose response. parent_comment_id is optional+nullable (may be undefined/null).
  return {
    id: comment.id,
    post_id: comment.post_id,
    user_id: comment.user_id,
    user_session_id: comment.user_session_id,
    parent_comment_id: comment.parent_comment_id ?? undefined,
    body: comment.body,
    nest_depth: comment.nest_depth,
    is_removed: comment.is_removed,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
  };
}
