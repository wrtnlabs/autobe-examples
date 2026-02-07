import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformAdminPostsPostIdAnalyticsVotes(props: {
  admin: AdminPayload;
  postId: string;
}): Promise<IRedditPlatformPostVote> {
  const [upvoteResult, downvoteResult, voteCount] = await Promise.all([
    MyGlobal.prisma.reddit_platform_post_votes.count({
      where: { post_id: props.postId, vote_type: "upvote" },
    }),
    MyGlobal.prisma.reddit_platform_post_votes.count({
      where: { post_id: props.postId, vote_type: "downvote" },
    }),
    MyGlobal.prisma.reddit_platform_post_votes.count({
      where: { post_id: props.postId },
    }),
  ]);
  const voteRatio = downvoteResult === 0 ? null : upvoteResult / downvoteResult;
  const latestVote = await MyGlobal.prisma.reddit_platform_post_votes.findFirst(
    {
      where: { post_id: props.postId },
      orderBy: { updated_at: "desc" },
      select: { updated_at: true },
    },
  );
  return {
    upvote_count: upvoteResult,
    downvote_count: downvoteResult,
    vote_ratio: voteRatio,
    vote_count: voteCount,
    latest_vote_at: latestVote ? toISOStringSafe(latestVote.updated_at) : null,
  };
}
