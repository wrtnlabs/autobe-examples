import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityForumUserPostsPostId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, find the post to verify it exists and get author information
  // Also check that it hasn't been deleted already
  const post = await MyGlobal.prisma.community_forum_posts.findUnique({
    where: {
      id: props.postId,
      deleted_at: null, // Ensure we're not trying to delete an already deleted post
    },
    select: {
      id: true,
      community_forum_user_id: true,
    },
  });

  // If post doesn't exist or is already deleted, throw 404
  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Check if user is authorized to delete this post
  // User can delete if they are the author
  // Note: In a full implementation, we would also check for moderator/admin privileges
  // but we don't have access to moderator/admin authorization functions in this context
  const isAuthor = post.community_forum_user_id === props.user.id;

  if (!isAuthor) {
    throw new HttpException(
      "Forbidden: You can only delete your own posts",
      403,
    );
  }

  // Perform hard delete of the post
  // Database schema indicates cascading deletes for related data
  await MyGlobal.prisma.community_forum_posts.delete({
    where: {
      id: props.postId,
    },
  });

  // Return void as specified
  return;
}
