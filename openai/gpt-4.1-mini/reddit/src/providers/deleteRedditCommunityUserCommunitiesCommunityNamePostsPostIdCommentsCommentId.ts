import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteRedditCommunityUserCommunitiesCommunityNamePostsPostIdCommentsCommentId(props: {
  user: UserPayload;
  communityName: string;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, communityName, postId, commentId } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { name: communityName },
      select: { id: true },
    });

  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: postId },
    select: { reddit_community_community_id: true },
  });

  if (post.reddit_community_community_id !== community.id) {
    throw new HttpException("Post does not belong to community", 404);
  }

  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: commentId },
      select: {
        reddit_community_user_id: true,
        reddit_community_post_id: true,
        deleted_at: true,
      },
    });

  if (
    comment.reddit_community_post_id !== postId ||
    comment.deleted_at !== null
  ) {
    throw new HttpException("Comment not found or already deleted", 404);
  }

  const isAuthor = comment.reddit_community_user_id === user.id;
  let isModerator = false;

  if (!isAuthor) {
    const moderator =
      await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
        where: {
          reddit_community_community_id: community.id,
          reddit_community_moderator_id: user.id,
        },
      });

    isModerator = moderator !== null;
  }

  if (!isAuthor && !isModerator) {
    throw new HttpException("Unauthorized to delete comment", 403);
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: commentId },
    data: { deleted_at: now },
  });
}
