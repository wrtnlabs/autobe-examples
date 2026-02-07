import { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardBanAppealAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_ban_appealsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        appeal_reason: true,
        status: true,
        decision_reason: true,
        appealed_at: true,
        reviewed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        banRecord: true,
        user: DiscussionBoardUserAtSummaryTransformer.select(),
        reviewer: true,
      },
    } satisfies Prisma.discussion_board_ban_appealsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardBanAppeal.ISummary> {
    return {
      id: input.id,
      appeal_reason: input.appeal_reason,
      status: input.status,
      appealed_at: input.appealed_at.toISOString(),
      reviewed_at: input.reviewed_at ? input.reviewed_at.toISOString() : null,
      user: await DiscussionBoardUserAtSummaryTransformer.transform(input.user),
    };
  }
}
