import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteRedditCommunityModeratorCommunitiesCommunityNamePostsPostIdCommentsCommentId(props: {
  moderator: ModeratorPayload;
  communityName: string;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, communityName, postId, commentId } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: postId },
  });

  if (!post || post.reddit_community_community_id !== community.id) {
    throw new HttpException("Post not found in specified community", 404);
  }

  const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
    where: { id: commentId },
  });

  if (
    !comment ||
    comment.reddit_community_post_id !== postId ||
    comment.deleted_at !== null
  ) {
    throw new HttpException("Comment not found or already deleted", 404);
  }

  const moderatorAssignment =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        reddit_community_community_id: community.id,
        reddit_community_moderator_id: moderator.id,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException("Unauthorized to delete comment", 403);
  }

  const deletedAt = toISOStringSafe(new Date());

  await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: commentId },
    data: { deleted_at: deletedAt },
  });

  return;
}
