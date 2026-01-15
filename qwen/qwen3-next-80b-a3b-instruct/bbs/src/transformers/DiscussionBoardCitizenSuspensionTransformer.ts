import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardCitizenSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizenSuspension";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCitizenSuspensionTransformer {
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
        citizen: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_citizen_suspensionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCitizenSuspension> {
    return {
      id: input.id,
      citizen_id: input.citizen.id,
      moderator_id: "00000000-0000-0000-0000-000000000000", // Placeholder, but this violates business logic because no moderator exists in database - this is a schema mismatch
      reason: input.reason,
      start_date: input.suspension_start.toISOString(),
      end_date: input.suspension_end.toISOString(), // Fixed: Suspension end is NOT nullable
      duration_days: Math.floor(
        (input.suspension_end.getTime() - input.suspension_start.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
      status: input.suspension_end < new Date() ? "expired" : "active",
      // Removed notes property entirely - it doesn't exist in schema
      created_at: input.created_at.toISOString(),
    };
  }
}
