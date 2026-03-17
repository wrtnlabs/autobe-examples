import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityMemberPostsPostIdCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch vote by voteId
  const vote = await MyGlobal.prisma.community_comment_votes.findUniqueOrThrow({
    where: { id: props.voteId },
    select: {
      id: true,
      community_member_id: true,
      community_comment_id: true,
      vote_type: true,
      deleted_at: true,
    },
  });
  // Step 2: Verify the requesting member is the original voter
  if (vote.community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify the vote belongs to the specified comment
  if (vote.community_comment_id !== props.commentId) {
    throw new HttpException("Not Found", 404);
  }
  // Step 4: Fetch the comment to verify it belongs to the specified post
  const comment = await MyGlobal.prisma.community_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: {
      id: true,
      member_id: true,
      post_id: true,
    },
  });
  // Step 5: Verify the comment belongs to the specified post
  if (comment.post_id !== props.postId) {
    throw new HttpException("Not Found", 404);
  }
  // Step 6: Verify the vote is still active (not already retracted)
  if (vote.deleted_at !== null) {
    throw new HttpException("Conflict", 409);
  }
  // Compute compensating karma delta
  // Original upvote gave comment author +1, so retraction gives -1
  // Original downvote gave comment author -1, so retraction gives +1
  const compensatingDelta = vote.vote_type === "up" ? -1 : 1;
  const sourceType = "comment_vote_removed";
  // Step 7: Execute within a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // a. Soft-delete the vote
    await tx.community_comment_votes.update({
      where: { id: props.voteId },
      data: {
        deleted_at: new Date(),
      },
    });
    // b. Find the comment author's user profile
    const authorProfile = await tx.community_user_profiles.findUniqueOrThrow({
      where: { community_member_id: comment.member_id },
      select: {
        id: true,
        karma_score: true,
      },
    });
    // c. Update karma_score on user profile
    await tx.community_user_profiles.update({
      where: { id: authorProfile.id },
      data: {
        karma_score: authorProfile.karma_score + compensatingDelta,
        updated_at: new Date(),
      },
    });
    // d. Insert compensating karma log entry
    await tx.community_user_profile_karma_logs.create({
      data: {
        id: v4(),
        community_user_profile_id: authorProfile.id,
        community_comment_vote_id: props.voteId,
        community_post_vote_id: null,
        source_type: sourceType,
        delta: compensatingDelta,
        created_at: new Date(),
      },
    });
  });
}
