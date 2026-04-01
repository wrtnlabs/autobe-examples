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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeVoteTransformer } from "../transformers/RedditLikeVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikeVote.ICreate;
}): Promise<IRedditLikeVote> {
  // Validate post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      author_id: true,
      is_deleted: true,
    },
  });
  if (post.is_deleted) {
    throw new HttpException("Post is deleted", 404);
  }
  // Validate member is not the author (cannot vote on own content)
  if (post.author_id === props.member.id) {
    throw new HttpException("Cannot vote on your own post", 403);
  }
  // Check for existing vote
  const existingPostVote =
    await MyGlobal.prisma.reddit_like_post_votes.findFirst({
      where: {
        post: { id: props.postId },
        vote: { member: { id: props.member.id } },
      },
      select: {
        id: true,
        vote: {
          select: {
            id: true,
            vote_type: true,
          },
        },
      },
    });
  if (existingPostVote !== null) {
    // Update existing vote if vote_type changed
    if (existingPostVote.vote.vote_type !== props.body.vote_type) {
      // Calculate score delta: old vote was +1 or -1, new vote is opposite
      const oldScoreDelta =
        existingPostVote.vote.vote_type === "upvote" ? 1 : -1;
      const newScoreDelta = props.body.vote_type === "upvote" ? 1 : -1;
      const scoreChange = newScoreDelta - oldScoreDelta; // e.g., -1 - 1 = -2
      // Update vote
      const updatedVote = await MyGlobal.prisma.reddit_like_votes.update({
        where: { id: existingPostVote.vote.id },
        data: {
          vote_type: props.body.vote_type,
          updated_at: new Date(),
        },
        ...RedditLikeVoteTransformer.select(),
      });
      // Update post vote_score
      await MyGlobal.prisma.reddit_like_posts.update({
        where: { id: props.postId },
        data: {
          vote_score: { increment: scoreChange },
        },
      });
      return await RedditLikeVoteTransformer.transform(updatedVote);
    }
    // Vote type unchanged, return existing vote
    const existingVote =
      await MyGlobal.prisma.reddit_like_votes.findUniqueOrThrow({
        where: { id: existingPostVote.vote.id },
        ...RedditLikeVoteTransformer.select(),
      });
    return await RedditLikeVoteTransformer.transform(existingVote);
  }
  // Create new vote
  const voteData = await RedditLikeVoteCollector.collect({
    body: props.body,
    redditLikeMembers: { id: props.member.id },
  });
  const newVote = await MyGlobal.prisma.reddit_like_votes.create({
    data: voteData,
    ...RedditLikeVoteTransformer.select(),
  });
  // Create post_vote link
  await MyGlobal.prisma.reddit_like_post_votes.create({
    data: {
      id: v4(),
      vote: { connect: { id: newVote.id } },
      post: { connect: { id: props.postId } },
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Update post vote_score
  const scoreDelta = props.body.vote_type === "upvote" ? 1 : -1;
  await MyGlobal.prisma.reddit_like_posts.update({
    where: { id: props.postId },
    data: {
      vote_score: { increment: scoreDelta },
    },
  });
  return await RedditLikeVoteTransformer.transform(newVote);
}
