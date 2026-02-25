import { ICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformCommentVoteScoreTransformer {
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
        comment: true,
      },
    } satisfies Prisma.community_platform_comment_vote_scoresFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommentVoteScore> {
    return {
      id: input.id,
      upvote_count: input.upvote_count,
      downvote_count: input.downvote_count,
      score: input.score,
      last_updated_at: input.last_updated_at.toISOString(),
      created_at: input.created_at.toISOString(),
    };
  }
}
