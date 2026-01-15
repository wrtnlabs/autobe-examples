import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardCitizenSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizenSuspension";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCitizenSuspensionAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_citizen_suspensionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        suspension_start: true,
        suspension_end: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        moderation_action_id: true, // Added missing field
        appeal_status: true, // Added missing field
        citizen: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_citizen_suspensionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCitizenSuspension.ISummary> {
    return {
      id: input.id,
      citizen_id: input.citizen.id,
      status: input.deleted_at
        ? "reversed"
        : input.suspension_end && input.suspension_end < new Date()
          ? "expired"
          : "active",
      start_date: toISOStringSafe(input.suspension_start),
      end_date: toISOStringSafe(input.suspension_end),
      reason_code: input.reason,
      reason_description: input.reason,
      duration_days: Math.floor(
        (input.suspension_end.getTime() - input.suspension_start.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
      created_at: toISOStringSafe(input.created_at),
      moderation_action_id: input.moderation_action_id || "",
      appeal_status: input.appeal_status || "",
    };
  }
}
