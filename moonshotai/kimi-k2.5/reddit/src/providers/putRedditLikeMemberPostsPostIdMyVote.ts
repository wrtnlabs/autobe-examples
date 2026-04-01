import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeVoteTransformer } from "../transformers/RedditLikeVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeMemberPostsPostIdMyVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikeVote.IUpdate;
}): Promise<IRedditLikeVote> {
  // Validate post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      author_id: true,
      is_deleted: true,
      vote_score: true,
    },
  });
  if (post.is_deleted) {
    throw new HttpException("Cannot vote on deleted content", 400);
  }
  if (post.author_id === props.member.id) {
    throw new HttpException("Cannot vote on your own content", 400);
  }
  // Check for existing vote on this post by this member
  const existingVote = await MyGlobal.prisma.reddit_like_post_votes.findFirst({
    where: {
      post: { id: props.postId },
      vote: { member_id: props.member.id },
    },
    select: {
      id: true,
      reddit_like_vote_id: true,
      vote: {
        select: {
          id: true,
          vote_type: true,
        },
      },
    },
  });
  const now = new Date();
  let voteId: string & tags.Format<"uuid">;
  const voteType: "upvote" | "downvote" = props.body.vote_type;
  // Calculate karma and score deltas
  let karmaDelta = 0;
  let scoreDelta = 0;
  if (existingVote) {
    const oldVoteType = existingVote.vote.vote_type;
    if (oldVoteType !== voteType) {
      // Vote changed - calculate deltas
      if (oldVoteType === "upvote" && voteType === "downvote") {
        karmaDelta = -2;
        scoreDelta = -2;
      } else if (oldVoteType === "downvote" && voteType === "upvote") {
        karmaDelta = 2;
        scoreDelta = 2;
      }
      // Update existing vote
      await MyGlobal.prisma.reddit_like_votes.update({
        where: { id: existingVote.reddit_like_vote_id },
        data: {
          vote_type: voteType,
          updated_at: now,
        },
      });
    }
    voteId = existingVote.reddit_like_vote_id;
  } else {
    // New vote
    const newVoteId: string & tags.Format<"uuid"> = v4();
    voteId = newVoteId;
    if (voteType === "upvote") {
      karmaDelta = 1;
      scoreDelta = 1;
    } else {
      karmaDelta = -1;
      scoreDelta = -1;
    }
    // Create new vote record
    await MyGlobal.prisma.reddit_like_votes.create({
      data: {
        id: newVoteId,
        member_id: props.member.id,
        vote_type: voteType,
        created_at: now,
        updated_at: now,
      },
    });
    // Create post vote link
    const postVoteId: string & tags.Format<"uuid"> = v4();
    await MyGlobal.prisma.reddit_like_post_votes.create({
      data: {
        id: postVoteId,
        reddit_like_vote_id: newVoteId,
        reddit_like_post_id: props.postId,
        created_at: now,
        updated_at: now,
      },
    });
  }
  // Update post vote score if there was a change
  if (scoreDelta !== 0) {
    await MyGlobal.prisma.reddit_like_posts.update({
      where: { id: props.postId },
      data: {
        vote_score: { increment: scoreDelta },
      },
    });
  }
  // Fetch and return the vote record with transformer
  const vote = await MyGlobal.prisma.reddit_like_votes.findUniqueOrThrow({
    where: { id: voteId },
    ...RedditLikeVoteTransformer.select(),
  });
  return await RedditLikeVoteTransformer.transform(vote);
}
