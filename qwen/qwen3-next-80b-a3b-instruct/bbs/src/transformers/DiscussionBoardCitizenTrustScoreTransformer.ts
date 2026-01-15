import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardCitizenTrustScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizenTrustScore";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCitizenTrustScoreTransformer {
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
      },
    } satisfies Prisma.discussion_board_citizen_trust_scoresFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCitizenTrustScore> {
    return {
      id: input.id,
      citizen_id: input.citizen.id,
      score_value: input.trusted_score,
      earned_at: input.created_at.toISOString(),
    };
  }
}
