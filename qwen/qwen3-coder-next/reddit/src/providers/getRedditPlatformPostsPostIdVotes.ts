import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformPostsPostIdVotes(props: {
  postId: string;
}): Promise<IRedditPlatformPostVote.IStat> {
  const posts = await MyGlobal.prisma.reddit_platform_post_votes.findMany({
    where: {
      post_id: props.postId,
    },
    select: {
      vote_type: true,
    },
  });
  const upvoteCount = posts.filter((v) => v.vote_type === "1").length;
  const downvoteCount = posts.filter((v) => v.vote_type === "-1").length;
  return {
    upvote_count: upvoteCount,
    downvote_count: downvoteCount,
    vote_score: upvoteCount - downvoteCount,
  };
}
