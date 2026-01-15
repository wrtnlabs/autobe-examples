import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuspension";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSuspensionAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_suspensionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        suspended_at: true,
        unsuspended_at: true,
        reason: true,
        appeal_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        citizen: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_suspensionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSuspension.ISummary> {
    const now = new Date();
    return {
      id: input.id,
      citizen_id: input.citizen.id,
      moderator_id: input.citizen.id,
      type: input.deleted_at ? "permanent" : "temporary",
      reason: input.reason,
      start_date: input.suspended_at.toISOString(),
      end_date: input.unsuspended_at
        ? input.unsuspended_at.toISOString()
        : new Date("2300-01-01").toISOString(),
      duration_hours: Math.floor(
        (input.updated_at.getTime() - input.suspended_at.getTime()) /
          (1000 * 60 * 60),
      ),
      status:
        input.deleted_at !== null
          ? "revoked"
          : input.updated_at > now
            ? "active"
            : "expired",
      appeal_status: input.appeal_status,
      created_at: input.created_at.toISOString(),
    };
  }
}
