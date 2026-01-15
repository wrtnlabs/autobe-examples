import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardCitizenTrustScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizenTrustScore";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCitizenTrustScoreAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_citizen_trust_scoresGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        trusted_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        citizen: {
          select: {
            id: true,
          },
        },
        report_count: true,
        positive_contributions: true,
        moderation_actions: true,
      },
    } satisfies Prisma.discussion_board_citizen_trust_scoresFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCitizenTrustScore.ISummary> {
    return {
      citizen_id: input.citizen.id,
      total_score: input.trusted_score,
      score_change: 0, // Default value since not available in database
      last_updated_at: input.created_at.toISOString(),
      trust_level:
        input.trusted_score < 40
          ? "low"
          : input.trusted_score < 80
            ? "medium"
            : "high",
      report_count: input.report_count,
      positive_contributions: input.positive_contributions,
      moderation_actions: input.moderation_actions,
    };
  }
}
