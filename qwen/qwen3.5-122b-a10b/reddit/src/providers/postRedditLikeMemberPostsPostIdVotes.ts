import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
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
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId, deleted_at: null },
    select: {
      id: true,
      reddit_like_community_id: true,
      reddit_like_member_id: true,
    },
  });
  const ban = await MyGlobal.prisma.reddit_like_community_bans.findFirst({
    where: {
      community_id: post.reddit_like_community_id,
      member_id: props.member.id,
      deleted_at: null,
    },
  });
  if (ban !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const existingVote = await MyGlobal.prisma.reddit_like_votes.findFirst({
    where: {
      reddit_like_member_id: props.member.id,
      reddit_like_post_id: props.postId,
      deleted_at: null,
    },
  });
  const now = new Date();
  if (existingVote !== null) {
    const voteChange =
      existingVote.vote_type === "upvote"
        ? props.body.vote_type === "downvote"
          ? -2
          : 0
        : props.body.vote_type === "upvote"
          ? 2
          : 0;
    if (voteChange !== 0) {
      await MyGlobal.prisma.reddit_like_user_profiles.update({
        where: { reddit_like_member_id: post.reddit_like_member_id },
        data: {
          karma_score: {
            increment: voteChange,
          },
        },
      });
    }
    await MyGlobal.prisma.reddit_like_votes.update({
      where: { id: existingVote.id },
      data: {
        vote_type: props.body.vote_type,
        updated_at: now,
      },
    });
    const updated = await MyGlobal.prisma.reddit_like_votes.findUniqueOrThrow({
      where: { id: existingVote.id },
      ...RedditLikeVoteTransformer.select(),
    });
    return await RedditLikeVoteTransformer.transform(updated);
  }
  const karmaAdjustment = props.body.vote_type === "upvote" ? 1 : -1;
  await MyGlobal.prisma.reddit_like_user_profiles.update({
    where: { reddit_like_member_id: post.reddit_like_member_id },
    data: {
      karma_score: {
        increment: karmaAdjustment,
      },
    },
  });
  const created = await MyGlobal.prisma.reddit_like_votes.create({
    data: await RedditLikeVoteCollector.collect({
      body: props.body,
      member: { id: props.member.id },
      post: { id: props.postId },
    }),
    ...RedditLikeVoteTransformer.select(),
  });
  return await RedditLikeVoteTransformer.transform(created);
}
