import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardUserBanTransformer {
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
        appeal_decision_reason: true,
        revoked_at: true,
        revocation_reason: true,
        created_at: true,
        updated_at: true,
        bannedUser: DiscussionBoardUserAtSummaryTransformer.select(),
        banningAdministrator: DiscussionBoardAdminAtSummaryTransformer.select(),
        appeal_reviewer_id: true,
        revoked_by_id: true,
      },
    } satisfies Prisma.discussion_board_user_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardUserBan> {
    return {
      banned_user: await DiscussionBoardUserAtSummaryTransformer.transform(
        input.bannedUser,
      ),
      banning_administrator:
        await DiscussionBoardAdminAtSummaryTransformer.transform(
          input.banningAdministrator,
        ),
      appeal_reviewer: null,
      revoked_by: null,
      id: input.id,
      ban_reason: input.ban_reason,
      ban_duration_type: input.ban_duration_type,
      ban_duration_days: input.ban_duration_days ?? null,
      ban_started_at: toISOStringSafe(input.ban_started_at),
      ban_ends_at: input.ban_ends_at
        ? toISOStringSafe(input.ban_ends_at)
        : null,
      ban_status: input.ban_status,
      appeal_status: input.appeal_status,
      appeal_reason: input.appeal_reason ?? null,
      appeal_reviewed_at: input.appeal_reviewed_at
        ? toISOStringSafe(input.appeal_reviewed_at)
        : null,
      appeal_decision_reason: input.appeal_decision_reason ?? null,
      revoked_at: input.revoked_at ? toISOStringSafe(input.revoked_at) : null,
      revocation_reason: input.revocation_reason ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
