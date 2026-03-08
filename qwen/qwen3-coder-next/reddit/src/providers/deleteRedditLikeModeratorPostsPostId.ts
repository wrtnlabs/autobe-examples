import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeModeratorPostsPostId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the post with only the necessary fields for authorization
  const post = await MyGlobal.prisma.reddit_like_posts.findUnique({
    where: { id: props.postId },
    select: { id: true, community_id: true, author_id: true, deleted_at: true },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  if (post.deleted_at !== null) {
    throw new HttpException("Post already deleted", 409);
  }
  // Check if the moderator is authorized for this post's community
  // A moderator can delete posts in a community if they have a ModeratorRole with that community
  const moderatorRole =
    await MyGlobal.prisma.reddit_like_moderator_roles.findFirst({
      where: {
        user_id: props.moderator.id,
        community_id: post.community_id,
        role: { in: ["owner", "moderator"] },
      },
    });
  // Authorization: moderator must have a valid role for the post's community
  // OR the moderator is the post's author
  if (!moderatorRole && post.author_id !== props.moderator.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete the post and let cascades handle related records
  await MyGlobal.prisma.reddit_like_posts.delete({
    where: { id: props.postId },
  });
}
