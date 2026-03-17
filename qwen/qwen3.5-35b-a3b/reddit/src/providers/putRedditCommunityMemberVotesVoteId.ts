import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityVoteTransformer } from "../transformers/RedditCommunityVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberVotesVoteId(props: {
  member: MemberPayload;
  voteId: string & tags.Format<"uuid">;
  body: IRedditCommunityVote.IUpdate;
}): Promise<IRedditCommunityVote> {
  const now = new Date();
  const vote = await MyGlobal.prisma.reddit_community_votes.findUniqueOrThrow({
    where: { id: props.voteId },
    select: {
      id: true,
      member_id: true,
      vote_type: true,
      deleted_at: true,
      target_post_id: true,
      target_comment_id: true,
      updated_at: true,
    },
  });
  if (vote.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (vote.deleted_at !== null) {
    throw new HttpException("Vote already deleted", 400);
  }
  const oldVoteType = vote.vote_type;
  const newVoteType = props.body.vote_type;
  const updateData: Prisma.reddit_community_votesUpdateInput = {
    updated_at: now,
  };
  if (newVoteType === null) {
    updateData.deleted_at = now;
  } else {
    updateData.vote_type = newVoteType;
  }
  await MyGlobal.prisma.reddit_community_votes.update({
    where: { id: props.voteId },
    data: updateData,
  });
  const adjustment = calculateAdjustment(oldVoteType, newVoteType);
  if (adjustment !== 0) {
    if (vote.target_post_id) {
      const updatedPost =
        await MyGlobal.prisma.reddit_community_posts.findUnique({
          where: { id: vote.target_post_id },
          select: { author_id: true },
        });
      if (updatedPost && updatedPost.author_id !== props.member.id) {
        await adjustKarma(updatedPost.author_id, adjustment, v4(), now);
      }
    } else if (vote.target_comment_id) {
      const updatedComment =
        await MyGlobal.prisma.reddit_community_comments.findUnique({
          where: { id: vote.target_comment_id },
          select: { reddit_community_members_id: true },
        });
      if (
        updatedComment &&
        updatedComment.reddit_community_members_id !== props.member.id
      ) {
        await adjustKarma(
          updatedComment.reddit_community_members_id,
          adjustment,
          v4(),
          now,
        );
      }
    }
  }
  const updated =
    await MyGlobal.prisma.reddit_community_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      include: {
        member: true,
        targetPost: true,
        targetComment: true,
        karmaSnapshots: true,
        postTarget: true,
        commentVote: true,
      },
    });
  return await RedditCommunityVoteTransformer.transform(updated);
}
function calculateAdjustment(
  oldType: string,
  newType: "upvote" | "downvote" | null | undefined,
): number {
  if (newType === null) {
    return oldType === "upvote" ? 1 : -1;
  }
  if (oldType === "upvote" && newType === "downvote") {
    return -2;
  }
  if (oldType === "downvote" && newType === "upvote") {
    return 2;
  }
  return 0;
}
async function adjustKarma(
  memberId: string,
  adjustment: number,
  voteId: string,
  now: Date,
): Promise<void> {
  const karmaRecord =
    await MyGlobal.prisma.reddit_community_user_karmas.findUnique({
      where: { reddit_community_member_id: memberId },
    });
  if (!karmaRecord) {
    return;
  }
  const newScore = karmaRecord.current_score + adjustment;
  await MyGlobal.prisma.reddit_community_user_karmas.update({
    where: { reddit_community_member_id: memberId },
    data: { current_score: Number(newScore), updated_at: now },
  });
  await MyGlobal.prisma.reddit_community_karma_snapshots.create({
    data: {
      id: v4(),
      reddit_community_user_id: memberId,
      reddit_community_vote_id: voteId,
      karma_delta: adjustment,
      karma_after_change: Number(newScore),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
}
