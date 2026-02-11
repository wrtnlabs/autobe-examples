import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostVoteCollector } from "../collectors/RedditPlatformPostVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostVoteTransformer } from "../transformers/RedditPlatformPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string;
  body: IRedditPlatformPostVote.ICreate;
}): Promise<IRedditPlatformPostVote> {
  // Check that the post exists before creating a vote
  const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Business rule: Users cannot vote on their own posts
  if (post.author_id === props.member.id) {
    throw new HttpException("You cannot vote on your own post", 403);
  }
  // Create or update the vote using collector
  const created = await MyGlobal.prisma.reddit_platform_post_votes.upsert({
    where: {
      user_id_post_id: {
        user_id: props.member.id,
        post_id: props.postId,
      },
    },
    create: await RedditPlatformPostVoteCollector.collect({
      body: props.body,
      redditPlatformMembers: { id: props.member.id } as IEntity,
      redditPlatformPostVotes: { id: props.postId } as IEntity,
    }),
    update: {
      vote_type: props.body.vote_type,
      updated_at: toISOStringSafe(new Date()),
    },
    ...RedditPlatformPostVoteTransformer.select(),
  });
  return await RedditPlatformPostVoteTransformer.transform(created);
}
