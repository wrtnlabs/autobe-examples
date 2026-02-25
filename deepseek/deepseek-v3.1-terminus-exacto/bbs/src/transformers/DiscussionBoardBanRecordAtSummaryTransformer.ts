import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardBanRecordAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_user_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ban_reason: true,
        ban_duration_type: true,
        ban_duration_days: true,
        ban_started_at: true,
        ban_ends_at: true,
        ban_status: true,
        appeal_status: true,
        appeal_reason: true,
        appeal_reviewed_at: true,
        appeal_reviewer_id: true,
        appeal_decision_reason: true,
        revoked_at: true,
        revoked_by_id: true,
        revocation_reason: true,
        created_at: true,
        updated_at: true,
        bannedUser: DiscussionBoardUserAtSummaryTransformer.select(),
        banningAdministrator: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_user_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardBanRecord.ISummary> {
    return {
      id: input.id,
      banReason: input.ban_reason,
      banDurationType: input.ban_duration_type,
      banDurationDays: input.ban_duration_days ?? null,
      banStartedAt: input.ban_started_at.toISOString(),
      banEndsAt: input.ban_ends_at?.toISOString() ?? null,
      banStatus: input.ban_status,
      appealStatus: input.appeal_status,
      bannedUser: await DiscussionBoardUserAtSummaryTransformer.transform(
        input.bannedUser,
      ),
      banningAdministrator:
        await DiscussionBoardAdminAtSummaryTransformer.transform(
          input.banningAdministrator,
        ),
    };
  }
}
