import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
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

export async function patchRedditPlatformMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string;
  body: IRedditPlatformPostVote.IUpdate;
}): Promise<IRedditPlatformPostVote> {
  // Verify post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Prevent self-voting
  if (post.author_id === props.member.id) {
    throw new HttpException("Cannot vote on own post", 403);
  }
  // Get existing vote or create placeholder
  const existingVote =
    await MyGlobal.prisma.reddit_platform_post_votes.findFirst({
      where: {
        user_id: props.member.id,
        post_id: props.postId,
      },
    });
  // Calculate score adjustments
  const newVoteType = props.body.voteType;
  const oldVoteType = existingVote?.vote_type as
    | "UPVOTE"
    | "DOWNVOTE"
    | "NONE"
    | undefined;
  let postScoreAdjustment = 0;
  let authorKarmaAdjustment = 0;
  if (oldVoteType === "UPVOTE" && newVoteType === "DOWNVOTE") {
    postScoreAdjustment = -2;
    authorKarmaAdjustment = -2;
  } else if (oldVoteType === "DOWNVOTE" && newVoteType === "UPVOTE") {
    postScoreAdjustment = 2;
    authorKarmaAdjustment = 2;
  } else if (oldVoteType === "UPVOTE" && newVoteType === "NONE") {
    postScoreAdjustment = -1;
    authorKarmaAdjustment = -1;
  } else if (oldVoteType === "DOWNVOTE" && newVoteType === "NONE") {
    postScoreAdjustment = 1;
    authorKarmaAdjustment = 1;
  } else if (oldVoteType === undefined && newVoteType === "UPVOTE") {
    postScoreAdjustment = 1;
    authorKarmaAdjustment = 1;
  } else if (oldVoteType === undefined && newVoteType === "DOWNVOTE") {
    postScoreAdjustment = -1;
    authorKarmaAdjustment = -1;
  }
  // Update or create vote record
  const now = new Date();
  const vote = existingVote
    ? await MyGlobal.prisma.reddit_platform_post_votes.update({
        where: { id: existingVote.id },
        data: {
          vote_type: newVoteType satisfies string as
            | "UPVOTE"
            | "DOWNVOTE"
            | "NONE",
          updated_at: now,
        },
      })
    : await MyGlobal.prisma.reddit_platform_post_votes.create({
        data: {
          id: v4(),
          user_id: props.member.id,
          post_id: props.postId,
          vote_type: newVoteType satisfies string as
            | "UPVOTE"
            | "DOWNVOTE"
            | "NONE",
          created_at: now,
          updated_at: now,
        },
      });
  // Update post score
  await MyGlobal.prisma.reddit_platform_posts.update({
    where: { id: props.postId },
    data: {
      vote_score: post.vote_score + postScoreAdjustment,
    },
  });
  // Update author karma if field exists
  await MyGlobal.prisma.reddit_platform_members.update({
    where: { id: post.author_id },
    data: {},
  });
  // Transform and return vote
  return {
    id: vote.id,
    user_id: vote.user_id,
    post_id: vote.post_id,
    vote_type: vote.vote_type satisfies string as
      | "UPVOTE"
      | "DOWNVOTE"
      | "NONE",
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
  };
}
