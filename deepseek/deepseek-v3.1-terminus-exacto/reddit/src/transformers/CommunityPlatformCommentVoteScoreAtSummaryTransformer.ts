import { ICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformCommentVoteScoreAtSummaryTransformer {
  export type Payload = Prisma.community_platform_comment_vote_scoresGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        upvote_count: true,
        downvote_count: true,
        score: true,
        last_updated_at: true,
        created_at: true,
        comment: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_commentsFindManyArgs,
      },
    } satisfies Prisma.community_platform_comment_vote_scoresFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommentVoteScore.ISummary> {
    return {
      id: input.id,
      upvote_count: input.upvote_count,
      downvote_count: input.downvote_count,
      score: input.score,
      last_updated_at: input.last_updated_at.toISOString(),
      comment_id: input.comment.id,
    };
  }
}
