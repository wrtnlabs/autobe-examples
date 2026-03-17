import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityCommentVoteTransformer } from "../transformers/CommunityCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityMemberPostsPostIdCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityCommentVote.IUpdate;
}): Promise<ICommunityCommentVote> {
  // Step 1: Find the vote, ensure it is active (not soft-deleted)
  const vote = await MyGlobal.prisma.community_comment_votes.findFirstOrThrow({
    where: {
      id: props.voteId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_member_id: true,
      community_comment_id: true,
      vote_type: true,
      comment: {
        select: {
          id: true,
          post_id: true,
          member_id: true,
        },
      },
    },
  });
  // Step 2: Verify the vote belongs to the specified comment and post
  if (vote.community_comment_id !== props.commentId) {
    throw new HttpException(
      "Vote does not belong to the specified comment",
      404,
    );
  }
  if (vote.comment.post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      404,
    );
  }
  // Step 3: Verify the requesting member owns this vote
  if (vote.community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Idempotent — if direction unchanged, return existing record as-is
  if (vote.vote_type === props.body.voteType) {
    const unchanged =
      await MyGlobal.prisma.community_comment_votes.findUniqueOrThrow({
        where: { id: props.voteId },
        ...CommunityCommentVoteTransformer.select(),
      });
    return CommunityCommentVoteTransformer.transform(unchanged);
  }
  // Step 5: Compute karma delta for the direction change
  // 'up' (+1) → 'down' (-1): net change is -2
  // 'down' (-1) → 'up' (+1): net change is +2
  const karmaDelta: number = props.body.voteType === "up" ? 2 : -2;
  // Find the comment author's user profile (for karma update)
  const authorProfile =
    await MyGlobal.prisma.community_user_profiles.findFirstOrThrow({
      where: { community_member_id: vote.comment.member_id },
      select: { id: true, karma_score: true },
    });
  // Step 6: Execute the update atomically in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // a. Update the vote direction and refresh updated_at
    await tx.community_comment_votes.update({
      where: { id: props.voteId },
      data: {
        vote_type: props.body.voteType,
        updated_at: new Date(),
      },
    });
    // b. Append a karma log entry for the direction change
    await tx.community_user_profile_karma_logs.create({
      data: {
        id: v4(),
        userProfile: { connect: { id: authorProfile.id } },
        commentVote: { connect: { id: props.voteId } },
        source_type: "comment_vote_direction_changed",
        delta: karmaDelta,
        created_at: new Date(),
      },
    });
    // c. Increment/decrement the denormalized karma score
    await tx.community_user_profiles.update({
      where: { id: authorProfile.id },
      data: {
        karma_score: authorProfile.karma_score + karmaDelta,
        updated_at: new Date(),
      },
    });
  });
  // Step 7: Return the updated vote record via the transformer
  const updated =
    await MyGlobal.prisma.community_comment_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      ...CommunityCommentVoteTransformer.select(),
    });
  return CommunityCommentVoteTransformer.transform(updated);
}
