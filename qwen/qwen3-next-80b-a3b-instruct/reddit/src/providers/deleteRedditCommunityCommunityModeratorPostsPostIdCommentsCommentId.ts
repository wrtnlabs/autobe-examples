import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCommunityCommunityModeratorPostsPostIdCommentsCommentId(props: {
  communityModerator: CommunitymoderatorPayload;
  postId: string;
  commentId: string;
}): Promise<void> {
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { id: true, author_id: true, post_id: true, deleted_at: true },
    });
  // Verify comment not already deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment already deleted", 404);
  }
  // Verify post exists and get its community
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { community_id: true },
  });
  // Check if actor is either the author or a moderator of the community
  const isAuthor = comment.author_id === props.communityModerator.id;
  const isModerator =
    (await MyGlobal.prisma.reddit_community_moderators.count({
      where: {
        user_id: props.communityModerator.id,
        community_id: post.community_id,
      },
    })) > 0;
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  const now = toISOStringSafe(new Date());
  // Atomically update comment and decrement post comment count
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_community_comments.update({
      where: { id: props.commentId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.reddit_community_posts.update({
      where: { id: props.postId },
      data: {
        comment_count: { decrement: 1 },
      },
    }),
  ]);
}
