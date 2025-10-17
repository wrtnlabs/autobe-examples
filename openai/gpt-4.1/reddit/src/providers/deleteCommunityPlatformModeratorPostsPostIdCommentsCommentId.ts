import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityPlatformModeratorPostsPostIdCommentsCommentId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, postId, commentId } = props;

  // Fetch the comment, ensure it belongs to the post and not deleted
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: commentId },
  });

  if (!comment || comment.community_platform_post_id !== postId) {
    throw new HttpException("Comment not found in this post", 404);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment already deleted", 409);
  }

  // Fetch the post to find its community
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: comment.community_platform_post_id },
  });
  if (!post) {
    throw new HttpException("Parent post does not exist", 404);
  }

  // Confirm moderator manages this community
  const moderatorRecord =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: moderator.id,
        community_id: post.community_platform_community_id,
        deleted_at: null,
        status: "active",
      },
    });
  if (!moderatorRecord) {
    throw new HttpException("You are not a moderator of this community", 403);
  }

  // Soft delete the comment
  const deletedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_comments.update({
    where: { id: commentId },
    data: {
      deleted_at: deletedAt,
      updated_at: deletedAt,
    },
  });

  // Audit log
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "moderator",
      actor_id: moderator.id,
      action_type: "delete",
      target_table: "community_platform_comments",
      target_id: commentId,
      details: JSON.stringify({
        postId,
        commentId,
        communityId: post.community_platform_community_id,
      }),
      created_at: deletedAt,
    },
  });
}
