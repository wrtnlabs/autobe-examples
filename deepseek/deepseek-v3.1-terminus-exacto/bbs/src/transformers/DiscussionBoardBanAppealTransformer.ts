import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardBanRecordAtSummaryTransformer } from "./DiscussionBoardBanRecordAtSummaryTransformer";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardBanAppealTransformer {
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
        banRecord: DiscussionBoardBanRecordAtSummaryTransformer.select(),
        user: DiscussionBoardUserAtSummaryTransformer.select(),
        reviewer: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_ban_appealsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardBanAppeal> {
    return {
      id: input.id,
      appeal_reason: input.appeal_reason,
      status: input.status,
      decision_reason: input.decision_reason ?? null,
      appealed_at: input.appealed_at.toISOString(),
      reviewed_at: input.reviewed_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      banRecord: await DiscussionBoardBanRecordAtSummaryTransformer.transform(
        input.banRecord,
      ),
      user: await DiscussionBoardUserAtSummaryTransformer.transform(input.user),
      reviewer: input.reviewer
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(
            input.reviewer,
          )
        : null,
    };
  }
}
