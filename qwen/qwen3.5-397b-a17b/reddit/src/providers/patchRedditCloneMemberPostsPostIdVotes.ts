import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostVoteCollector } from "../collectors/RedditClonePostVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostVoteTransformer } from "../transformers/RedditClonePostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostVote.ICreate;
}): Promise<IRedditClonePostVote> {
  // Verify post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId, deleted_at: null },
    select: {
      id: true,
      member_id: true,
      community_id: true,
    },
  });
  // Reject if member is voting on own post
  if (post.member_id === props.member.id) {
    throw new HttpException("Cannot vote on your own post", 400);
  }
  // Check if member is banned from the post's community
  const ban = await MyGlobal.prisma.reddit_clone_bans.findFirst({
    where: {
      community_id: post.community_id,
      member_id: props.member.id,
      deleted_at: null,
    },
  });
  if (ban !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Query existing vote for this member on this post
  const existingVote = await MyGlobal.prisma.reddit_clone_votes.findFirst({
    where: {
      member_id: props.member.id,
      target_type: "POST",
      target_id: props.postId,
      deleted_at: null,
    },
  });
  // Calculate vote delta for karma adjustment
  let karmaDelta = 0;
  if (existingVote) {
    if (
      existingVote.vote_type === "UPVOTE" &&
      props.body.vote_type === "DOWNVOTE"
    ) {
      karmaDelta = -2;
    } else if (
      existingVote.vote_type === "DOWNVOTE" &&
      props.body.vote_type === "UPVOTE"
    ) {
      karmaDelta = 2;
    } else if (
      existingVote.vote_type === "UPVOTE" &&
      props.body.vote_type === null
    ) {
      karmaDelta = -1;
    } else if (
      existingVote.vote_type === "DOWNVOTE" &&
      props.body.vote_type === null
    ) {
      karmaDelta = 1;
    }
  } else {
    if (props.body.vote_type === "UPVOTE") {
      karmaDelta = 1;
    } else if (props.body.vote_type === "DOWNVOTE") {
      karmaDelta = -1;
    }
  }
  // Handle vote operations
  if (existingVote) {
    if (props.body.vote_type === null) {
      await MyGlobal.prisma.reddit_clone_votes.update({
        where: { id: existingVote.id },
        data: {
          vote_type: existingVote.vote_type,
          updated_at: new Date(),
          deleted_at: new Date(),
        },
      });
    } else {
      await MyGlobal.prisma.reddit_clone_votes.update({
        where: { id: existingVote.id },
        data: {
          vote_type: props.body.vote_type,
          updated_at: new Date(),
        },
      });
    }
  } else if (props.body.vote_type !== null) {
    await MyGlobal.prisma.reddit_clone_votes.create({
      data: await RedditClonePostVoteCollector.collect({
        body: props.body,
        redditCloneMembers: { id: props.member.id },
        redditClonePosts: { id: props.postId },
      }),
    });
  }
  // Compute updated post vote score
  const voteCounts = await MyGlobal.prisma.reddit_clone_votes.groupBy({
    by: ["vote_type"],
    where: {
      target_type: "POST",
      target_id: props.postId,
      deleted_at: null,
    },
    _count: { vote_type: true },
  });
  let upvotes = 0;
  let downvotes = 0;
  for (const vc of voteCounts) {
    if (vc.vote_type === "UPVOTE") {
      upvotes = vc._count.vote_type;
    } else if (vc.vote_type === "DOWNVOTE") {
      downvotes = vc._count.vote_type;
    }
  }
  const postVoteScore = upvotes - downvotes;
  // Update post author's karma score
  if (karmaDelta !== 0) {
    const karmaScore =
      await MyGlobal.prisma.reddit_clone_karma_scores.findUniqueOrThrow({
        where: { member_id: post.member_id },
      });
    await MyGlobal.prisma.reddit_clone_karma_scores.update({
      where: { member_id: post.member_id },
      data: {
        score: { increment: karmaDelta },
      },
    });
    await MyGlobal.prisma.reddit_clone_karma_score_changes.create({
      data: {
        id: v4(),
        reddit_clone_karma_score_id: karmaScore.id,
        source_type: "POST",
        source_id: props.postId,
        change_amount: karmaDelta,
        created_at: new Date(),
      },
    });
  }
  // Get the current vote record
  const currentVote = await MyGlobal.prisma.reddit_clone_votes.findFirst({
    where: {
      member_id: props.member.id,
      target_type: "POST",
      target_id: props.postId,
    },
    orderBy: { created_at: "desc" },
    ...RedditClonePostVoteTransformer.select(),
  });
  // If no vote exists (no-op case), return synthetic response
  if (!currentVote) {
    return {
      id: v4() as string & tags.Format<"uuid">,
      vote_type: "UPVOTE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      member: {
        id: props.member.id,
        username: "",
        display_name: "",
        karma_score: 0,
        created_at: new Date().toISOString(),
      } satisfies IRedditCloneMember.ISummary,
      post_vote_score: postVoteScore,
    } satisfies IRedditClonePostVote;
  }
  return await RedditClonePostVoteTransformer.transform(
    currentVote,
    postVoteScore,
  );
}
