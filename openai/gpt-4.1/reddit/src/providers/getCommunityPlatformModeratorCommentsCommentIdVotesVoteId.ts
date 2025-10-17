import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getCommunityPlatformModeratorCommentsCommentIdVotesVoteId(props: {
  moderator: ModeratorPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVote> {
  // 1. Lookup the vote by unique voteId and commentId, not soft-deleted
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: { id: props.voteId },
    });
  if (
    !vote ||
    vote.community_platform_comment_id !== props.commentId ||
    vote.deleted_at
  ) {
    throw new HttpException("Vote not found", 404);
  }

  // 2. Lookup parent comment to check community, and enforce moderator scope
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: { community_platform_post_id: true },
  });
  if (!comment) throw new HttpException("Comment not found", 404);

  // 3. Get post for community id
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: comment.community_platform_post_id },
    select: { community_platform_community_id: true },
  });
  if (!post) throw new HttpException("Post not found", 404);

  // 4. Confirm moderator is assigned to community. ModeratorPayload.id is member_id
  const modAssignment =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: post.community_platform_community_id,
        deleted_at: null,
        status: "active",
      },
    });
  if (!modAssignment) {
    throw new HttpException(
      "Forbidden: Not assigned moderator for the community",
      403,
    );
  }

  // 5. Return the vote object, as per ICommunityPlatformCommentVote
  return {
    id: vote.id,
    community_platform_comment_id: vote.community_platform_comment_id,
    community_platform_member_id: vote.community_platform_member_id,
    vote_value: vote.vote_value === 1 ? 1 : -1,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    deleted_at: vote.deleted_at ? toISOStringSafe(vote.deleted_at) : null,
  };
}
