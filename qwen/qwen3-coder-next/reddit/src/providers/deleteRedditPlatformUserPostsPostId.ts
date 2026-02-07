import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditPlatformUserPostsPostId(props: {
  user: UserPayload;
  postId: string;
}): Promise<void> {
  // Find post first
  const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) throw new HttpException("Post not found", 404);
  // Verify authorization
  if (post.author_id !== props.user.id) {
    const isCommunityModerator =
      await MyGlobal.prisma.reddit_platform_community_roles.findFirst({
        where: {
          community_id: post.community_id,
          user_id: props.user.id,
          role: { in: ["owner", "moderator"] },
        },
      });
    if (!isCommunityModerator) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Find all comments on this post
  const comments = await MyGlobal.prisma.reddit_platform_comments.findMany({
    where: { post_id: props.postId },
  });
  // Delete all comment votes
  if (comments.length > 0) {
    await MyGlobal.prisma.reddit_platform_comment_votes.deleteMany({
      where: { comment_id: { in: comments.map((c) => c.id) } },
    });
  }
  // Delete all comments
  await MyGlobal.prisma.reddit_platform_comments.deleteMany({
    where: { post_id: props.postId },
  });
  // Delete all post votes
  await MyGlobal.prisma.reddit_platform_post_votes.deleteMany({
    where: { post_id: props.postId },
  });
  // Delete the post
  await MyGlobal.prisma.reddit_platform_posts.delete({
    where: { id: props.postId },
  });
}
