import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPlatformMemberCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IUpdate;
}): Promise<ICommunityPlatformCommentVote> {
  const { member, commentId, voteId, body } = props;

  // Ensure comment exists and is not deleted
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: commentId },
    select: { id: true, deleted_at: true, community_platform_member_id: true },
  });
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment does not exist or has been deleted.", 404);
  }

  // Disallow voting on own comment
  if (comment.community_platform_member_id === member.id) {
    throw new HttpException("You cannot vote on your own comment.", 403);
  }

  // Find the vote (by id), ensure it's for this comment, by this member, and not deleted
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: { id: voteId },
    });
  if (!vote || vote.deleted_at !== null) {
    throw new HttpException("Vote does not exist or has been deleted.", 404);
  }
  if (
    vote.community_platform_comment_id !== commentId ||
    vote.community_platform_member_id !== member.id
  ) {
    throw new HttpException("You are not authorized to update this vote.", 403);
  }

  // Allowed values: 1 | -1 only. If not, reject (API may pass any int32).
  if (body.vote_value !== 1 && body.vote_value !== -1) {
    throw new HttpException(
      "vote_value must be 1 (upvote) or -1 (downvote)",
      400,
    );
  }

  const now = toISOStringSafe(new Date());

  // Update the vote
  const updated = await MyGlobal.prisma.community_platform_comment_votes.update(
    {
      where: { id: voteId },
      data: {
        vote_value: body.vote_value,
        updated_at: now,
      },
    },
  );

  return {
    id: updated.id,
    community_platform_comment_id: updated.community_platform_comment_id,
    community_platform_member_id: updated.community_platform_member_id,
    vote_value: updated.vote_value === 1 ? 1 : -1,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
