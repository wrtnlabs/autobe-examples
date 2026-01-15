import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuspension";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSuspensionTransformer {
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
  ): Promise<IDiscussionBoardSuspension> {
    return {
      id: input.id,
      citizen_id: input.citizen.id,
      moderator_id: "00000000-0000-0000-0000-000000000000", // sentinel UUID placeholder
      start_date: input.suspended_at.toISOString(),
      end_date: input.unsuspended_at
        ? input.unsuspended_at.toISOString()
        : "2300-01-01T00:00:00.000Z", // sentinel for never expires
      reason: input.reason,
      status: input.appeal_status === "active" ? "active" : "expired",
      created_at: input.created_at.toISOString(),
    };
  }
}
