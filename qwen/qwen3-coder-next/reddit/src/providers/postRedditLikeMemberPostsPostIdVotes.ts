import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikePostVoteTransformer } from "../transformers/RedditLikePostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikePostVote.ICreate;
}): Promise<IRedditLikePostVote> {
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      author_id: true,
      community_id: true,
    },
  });
  if (post.author_id === props.member.id) {
    throw new HttpException("Cannot vote on your own post", 403);
  }
  const isBanned = await MyGlobal.prisma.reddit_like_bans.findFirst({
    where: {
      reddit_like_user_id: props.member.id,
      reddit_like_community_id: post.community_id,
      status: "active",
      deleted_at: null,
    },
  });
  if (isBanned !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  const existingVote = await MyGlobal.prisma.reddit_like_post_votes.findUnique({
    where: {
      voter_id_post_id: {
        voter_id: props.member.id,
        post_id: props.postId,
      },
    },
  });
  let finalVoteValue: 1 | -1 | 0 = props.body.value as 1 | -1 | 0;
  if (existingVote) {
    if (existingVote.value === finalVoteValue) {
      throw new HttpException("Vote already exists with the same value", 400);
    }
    await MyGlobal.prisma.reddit_like_post_votes.delete({
      where: { id: existingVote.id },
    });
    if (finalVoteValue !== 0) {
      await MyGlobal.prisma.reddit_like_post_votes.create({
        data: {
          id: v4(),
          value: finalVoteValue,
          created_at: new Date().toISOString(),
          voter_id: props.member.id,
          post_id: props.postId,
        },
      });
      const scoreAdjustment = existingVote.value === 1 ? -2 : 2;
      await MyGlobal.prisma.reddit_like_posts.update({
        where: { id: props.postId },
        data: {
          score:
            scoreAdjustment > 0
              ? { increment: scoreAdjustment }
              : { decrement: Math.abs(scoreAdjustment) },
        },
      });
      await MyGlobal.prisma.reddit_like_members.update({
        where: { id: post.author_id },
        data: {
          karma_score:
            scoreAdjustment > 0
              ? { increment: scoreAdjustment }
              : { decrement: Math.abs(scoreAdjustment) },
        },
      });
    }
  } else if (finalVoteValue !== 0) {
    await MyGlobal.prisma.reddit_like_post_votes.create({
      data: {
        id: v4(),
        value: finalVoteValue,
        created_at: new Date().toISOString(),
        voter_id: props.member.id,
        post_id: props.postId,
      },
    });
    await MyGlobal.prisma.reddit_like_posts.update({
      where: { id: props.postId },
      data: {
        score: finalVoteValue === 1 ? { increment: 1 } : { decrement: 1 },
      },
    });
    await MyGlobal.prisma.reddit_like_members.update({
      where: { id: post.author_id },
      data: {
        karma_score: finalVoteValue === 1 ? { increment: 1 } : { decrement: 1 },
      },
    });
  } else {
    throw new HttpException("No existing vote to remove", 400);
  }
  const vote = await MyGlobal.prisma.reddit_like_post_votes.findUniqueOrThrow({
    where: {
      voter_id_post_id: {
        voter_id: props.member.id,
        post_id: props.postId,
      },
    },
    ...RedditLikePostVoteTransformer.select(),
  });
  return await RedditLikePostVoteTransformer.transform(vote);
}
