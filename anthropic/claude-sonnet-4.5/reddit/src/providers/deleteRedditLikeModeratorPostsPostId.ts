import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteRedditLikeModeratorPostsPostId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, postId } = props;

  // Step 1: Fetch the post to verify it exists and get community context
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: postId },
    select: {
      id: true,
      reddit_like_community_id: true,
      deleted_at: true,
    },
  });

  // Check if post is already deleted
  if (post.deleted_at !== null) {
    throw new HttpException("Post has already been deleted", 400);
  }

  // Step 2: Verify moderator is assigned to the post's community
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        moderator_id: moderator.id,
        community_id: post.reddit_like_community_id,
      },
      select: {
        is_primary: true,
        permissions: true,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException(
      "Unauthorized: You are not a moderator of this community",
      403,
    );
  }

  // Step 3: Verify moderator has manage_posts permission
  // Primary moderators have all permissions automatically
  if (!moderatorAssignment.is_primary) {
    const hasManagePostsPermission =
      moderatorAssignment.permissions.includes("manage_posts");

    if (!hasManagePostsPermission) {
      throw new HttpException(
        "Unauthorized: You do not have permission to manage posts in this community",
        403,
      );
    }
  }

  // Step 4: Perform soft delete by setting deleted_at timestamp
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.reddit_like_posts.update({
    where: { id: postId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
