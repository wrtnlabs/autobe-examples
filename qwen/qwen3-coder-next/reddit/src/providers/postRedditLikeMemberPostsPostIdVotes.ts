import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikePostVoteCollector } from "../collectors/RedditLikePostVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikePostVoteTransformer } from "../transformers/RedditLikePostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string;
  body: IRedditLikePostVote.ICreate;
}): Promise<IRedditLikePostVote> {
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, author_id: true },
  });
  if (post.author_id === props.member.id) {
    throw new HttpException("Cannot vote on your own post", 403);
  }
  const existing = await MyGlobal.prisma.reddit_like_post_votes.findUnique({
    where: {
      voter_id_post_id: {
        voter_id: props.member.id,
        post_id: props.postId,
      },
    },
  });
  if (existing) {
    await MyGlobal.prisma.reddit_like_post_votes.delete({
      where: { id: existing.id },
    });
  }
  const vote = await MyGlobal.prisma.reddit_like_post_votes.create({
    data: await RedditLikePostVoteCollector.collect({
      body: props.body,
      redditLikeMembers: { id: props.member.id },
      redditLikePosts: { id: props.postId },
    }),
    ...RedditLikePostVoteTransformer.select(),
  });
  return await RedditLikePostVoteTransformer.transform(vote);
}
