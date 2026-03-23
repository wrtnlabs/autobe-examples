import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePostVotesSum } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVotesSum";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeGuestPostIdVoteStatistics(props: {
  guest: GuestPayload;
  postId: string;
}): Promise<IRedditLikePostVotesSum> {
  const sum = await MyGlobal.prisma.reddit_like_post_votes_sums.findUnique({
    where: { reddit_like_post_id: props.postId },
  });
  if (!sum) {
    return {
      vote_score: 0,
      upvotes: 0,
      downvotes: 0,
      status: "neutral",
    } satisfies IRedditLikePostVotesSum;
  }
  return {
    vote_score: sum.vote_score,
    upvotes: 0,
    downvotes: 0,
    status: "neutral",
  } satisfies IRedditLikePostVotesSum;
}
