import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditPlatformMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string;
  commentId: string;
}): Promise<void> {
  // Validate that the comment exists and belongs to the specified post
  const comment = await MyGlobal.prisma.reddit_platform_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      post_id: true,
      author_id: true,
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      400,
    );
  }
  // Check that the user has permission to delete the comment (comment author or moderator)
  const isAuthor = comment.author_id === props.member.id;
  // In a real implementation, you would check for moderator permissions
  // For now, only allow the comment author to delete their comment
  if (!isAuthor) {
    throw new HttpException("Forbidden", 403);
  }
  // Remove the comment record from the database
  await MyGlobal.prisma.reddit_platform_comments.delete({
    where: { id: props.commentId },
  });
  // Update the post's comment count by decrementing it
  await MyGlobal.prisma.reddit_platform_posts.update({
    where: { id: props.postId },
    data: {
      comment_count: { decrement: 1 },
    },
  });
  // Handle any dependent comments in the reply chain according to thread integrity rules
  // For now, we'll cascade delete all reply comments recursively
  // This is done by Prisma foreign key cascade delete, but if needed, you can add explicit cleanup
  // If you want to implement soft delete instead of hard delete for replies, modify accordingly
  return;
}
