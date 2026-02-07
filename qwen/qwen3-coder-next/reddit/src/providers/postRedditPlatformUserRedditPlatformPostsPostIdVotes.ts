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
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformUserRedditPlatformPostsPostIdVotes(props: {
  user: UserPayload;
  postId: string;
  body: IRedditPlatformPostVote.ICreate;
}): Promise<IRedditPlatformPostVote> {
  const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) throw new HttpException("Post not found", 404);
  const vote = await MyGlobal.prisma.reddit_platform_post_votes.create({
    data: await RedditPlatformPostVoteCollector.collect({
      body: props.body,
      user: props.user,
      post,
    }),
  });
  return {
    id: vote.id as string & tags.Format<"uuid">,
    user_id: vote.user_id as string & tags.Format<"uuid">,
    post_id: vote.post_id as string & tags.Format<"uuid">,
    vote_type: vote.vote_type,
    created_at: toISOStringSafe(vote.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(vote.updated_at) as string &
      tags.Format<"date-time">,
  };
}
