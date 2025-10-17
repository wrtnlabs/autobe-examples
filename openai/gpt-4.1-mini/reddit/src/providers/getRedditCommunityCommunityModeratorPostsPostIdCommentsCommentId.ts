import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function getRedditCommunityCommunityModeratorPostsPostIdCommentsCommentId(props: {
  communityModerator: CommunitymoderatorPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityComment> {
  const { communityModerator, postId, commentId } = props;

  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: postId },
    select: { reddit_community_community_id: true },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  const moderatorAssignment =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        member_id: communityModerator.id,
        community_id: post.reddit_community_community_id,
        member: { deleted_at: null },
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException(
      "Unauthorized: Not a moderator of this community",
      403,
    );
  }

  const comment = await MyGlobal.prisma.reddit_community_comments.findFirst({
    where: {
      id: commentId,
      reddit_community_post_id: postId,
      deleted_at: null,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  return {
    id: comment.id,
    reddit_community_post_id: comment.reddit_community_post_id,
    parent_comment_id: comment.parent_comment_id ?? undefined,
    author_member_id: comment.author_member_id ?? undefined,
    author_guest_id: comment.author_guest_id ?? undefined,
    body_text: comment.body_text,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
  };
}
