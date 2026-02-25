import { ICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformPostVoteScoreAtSummaryTransformer {
  export type Payload = Prisma.community_platform_post_vote_scoresGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        upvote_count: true,
        downvote_count: true,
        total_score: true,
        last_updated_at: true,
        created_at: true,
        updated_at: true,
        post: true,
      },
    } satisfies Prisma.community_platform_post_vote_scoresFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostVoteScore.ISummary> {
    return {
      id: input.id,
      upvote_count: input.upvote_count,
      downvote_count: input.downvote_count,
      total_score: input.total_score,
      last_updated_at: input.last_updated_at.toISOString(),
      created_at: input.created_at.toISOString(),
    };
  }
}
