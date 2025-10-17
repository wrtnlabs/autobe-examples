import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postRedditLikeModeratorPostsPostIdRestore(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditLikePost> {
  const { moderator, postId } = props;

  // Verify post exists and is currently deleted
  const post = await MyGlobal.prisma.reddit_like_posts.findUnique({
    where: { id: postId },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  if (post.deleted_at === null) {
    throw new HttpException("Post is not deleted and cannot be restored", 400);
  }

  // Verify moderator has permissions in the post's community
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: post.reddit_like_community_id,
        moderator_id: moderator.id,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException(
      "Unauthorized: You are not a moderator of this community",
      403,
    );
  }

  // Verify moderator has manage_posts permission
  const permissions = moderatorAssignment.permissions.split(",");
  if (!permissions.includes("manage_posts")) {
    throw new HttpException(
      "Unauthorized: You do not have manage_posts permission",
      403,
    );
  }

  // Restore the post by clearing deleted_at timestamp
  const restoredPost = await MyGlobal.prisma.reddit_like_posts.update({
    where: { id: postId },
    data: {
      deleted_at: null,
    },
  });

  return {
    id: restoredPost.id as string & tags.Format<"uuid">,
    type: restoredPost.type,
    title: restoredPost.title,
    created_at: toISOStringSafe(restoredPost.created_at),
    updated_at: toISOStringSafe(restoredPost.updated_at),
  };
}
