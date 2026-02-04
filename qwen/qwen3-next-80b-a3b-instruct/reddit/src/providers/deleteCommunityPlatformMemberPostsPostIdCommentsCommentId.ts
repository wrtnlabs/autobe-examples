import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPlatformMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the comment
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Find the associated post to verify ownership
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Verify comment belongs to the post using the correct relation name
  if (comment.post.id !== props.postId) {
    throw new HttpException("Comment does not belong to this post", 400);
  }
  // Check if user is the author or a moderator
  const isAuthor = comment.author_id === props.member.id;
  const isModerator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        id: props.member.id,
        // Use relation name 'community' instead of foreign key 'community_id'
        community: { id: post.community_id },
      },
    });
  if (!isAuthor && !isModerator) {
    throw new HttpException(
      "Forbidden - You can only delete your own comments unless you are a moderator",
      403,
    );
  }
  // Hard delete the comment (no soft delete available in schema)
  await MyGlobal.prisma.community_platform_comments.delete({
    where: { id: props.commentId },
  });
  // Decrement the parent post's comment_count
  await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: {
      comment_count: {
        decrement: 1,
      },
    },
  });
  // Log the deletion in moderation logs
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_moderation_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      action_type: "delete_comment",
      // Use correct field name 'actor_id' instead of 'member_id'
      actor_id: props.member.id,
      target_type: "comment",
      target_id: props.commentId,
      created_at: now,
      reason: "",
    },
  });
}
