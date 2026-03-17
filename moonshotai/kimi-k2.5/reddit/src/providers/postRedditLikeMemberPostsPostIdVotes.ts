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
import { RedditLikeVoteCollector } from "../collectors/RedditLikeVoteCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeVoteTransformer } from "../transformers/RedditLikeVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberPostsPostIdVotes(props: {
  member: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikeVote.ICreate;
}): Promise<IRedditLikeVote> {
  // Fetch post and verify it exists and is not deleted
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      author_id: true,
      vote_score: true,
      is_deleted: true,
    },
  });
  // Check post is not deleted
  if (post.is_deleted) {
    throw new HttpException("Post not found", 404);
  }
  // Validate member is not voting on their own post
  if (post.author_id === props.member.id) {
    throw new HttpException("Cannot vote on your own post", 403);
  }
  // Check for existing vote by this member on this post
  const existingVote = await MyGlobal.prisma.reddit_like_post_votes.findFirst({
    where: {
      reddit_like_post_id: props.postId,
      vote: {
        member_id: props.member.id,
      },
    },
    include: {
      vote: true,
    },
  });
  let voteId: string;
  let voteScoreDelta: number;
  if (existingVote) {
    // Member already voted - update the vote type if different
    const oldVoteType = existingVote.vote.vote_type;
    const newVoteType = props.body.vote_type;
    if (oldVoteType === newVoteType) {
      // Same vote type - no change needed, just return existing
      voteId = existingVote.vote.id;
      voteScoreDelta = 0;
    } else {
      // Vote changed - update vote_type
      voteId = existingVote.vote.id;
      await MyGlobal.prisma.reddit_like_votes.update({
        where: { id: voteId },
        data: {
          vote_type: newVoteType,
          updated_at: new Date(),
        },
      });
      // Calculate deltas: reverse old vote + apply new vote
      // old upvote (+1) -> new downvote (-1): score change = -2
      // old downvote (-1) -> new upvote (+1): score change = +2
      const oldValue = oldVoteType === "upvote" ? 1 : -1;
      const newValue = newVoteType === "upvote" ? 1 : -1;
      voteScoreDelta = newValue - oldValue;
    }
  } else {
    // New vote - create vote record
    const newVote = await MyGlobal.prisma.reddit_like_votes.create({
      data: await RedditLikeVoteCollector.collect({
        body: props.body,
        redditLikeMembers: { id: props.member.id },
        redditLikePosts: { id: props.postId },
      }),
    });
    voteId = newVote.id;
    // Calculate deltas for new vote
    voteScoreDelta = props.body.vote_type === "upvote" ? 1 : -1;
  }
  // Update post vote_score
  if (voteScoreDelta !== 0) {
    await MyGlobal.prisma.reddit_like_posts.update({
      where: { id: props.postId },
      data: {
        vote_score: post.vote_score + voteScoreDelta,
        updated_at: new Date(),
      },
    });
  }
  // Fetch and return the vote with transformer
  const vote = await MyGlobal.prisma.reddit_like_votes.findUniqueOrThrow({
    where: { id: voteId },
    ...RedditLikeVoteTransformer.select(),
  });
  return await RedditLikeVoteTransformer.transform(vote);
}
