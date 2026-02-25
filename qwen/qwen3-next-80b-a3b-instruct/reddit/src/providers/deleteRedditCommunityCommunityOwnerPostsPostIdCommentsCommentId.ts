import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCommunityCommunityOwnerPostsPostIdCommentsCommentId(props: {
  communityOwner: CommunityownerPayload;
  postId: string;
  commentId: string;
}): Promise<void> {
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { id: true, post_id: true, author_id: true, deleted_at: true },
    });
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment already deleted", 404);
  }
  if (comment.post_id !== props.postId) {
    throw new HttpException("Comment does not belong to post", 404);
  }
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { community_id: true },
  });
  // Fix: Query reddit_community_communities directly, using correct relation field 'owner_user_id'
  const isOwnerOfPostCommunity =
    await MyGlobal.prisma.reddit_community_communities.findFirst({
      where: {
        owner_user_id: props.communityOwner.id,
        id: post.community_id,
      },
    });
  if (
    comment.author_id !== props.communityOwner.id &&
    isOwnerOfPostCommunity === null
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: props.commentId },
    data: { deleted_at: now },
  });
  await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: props.postId },
    data: { comment_count: { decrement: 1 } },
  });
  return;
}
