import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformModeratorPostsPostIdAnalyticsVotes(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformPostVote> {
  const postVotes = await MyGlobal.prisma.reddit_platform_post_votes.findMany({
    where: {
      post_id: props.postId,
    },
  });
  // Calculate aggregate statistics
  const upvotes = postVotes.filter(
    (vote) => vote.vote_type === "upvote",
  ).length;
  const downvotes = postVotes.filter(
    (vote) => vote.vote_type === "downvote",
  ).length;
  const voteRatio = downvotes > 0 ? upvotes / downvotes : upvotes;
  // Calculate temporal patterns (votes by day)
  const temporalMap = new Map<string, number>();
  for (const vote of postVotes) {
    const dateKey = toISOStringSafe(vote.created_at).split("T")[0];
    temporalMap.set(dateKey, (temporalMap.get(dateKey) || 0) + 1);
  }
  const temporalPatterns = Array.from(temporalMap.entries()).map(
    ([date, count]) => ({
      date: date as string & tags.Format<"date-time">,
      count,
    }),
  );
  return {
    upvotes,
    downvotes,
    voteRatio,
    temporalPatterns,
  };
}
