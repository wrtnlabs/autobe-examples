import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardBanAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        status: true,
        justification: true,
        citizen: {
          select: {
            id: true,
          },
        },
        moderator: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardBan.ISummary> {
    return {
      id: input.id,
      citizen_id: input.citizen.id,
      created_at: input.created_at.toISOString(),
      expires_at: null, // Per DTO specification: banning_level is "permanent" which means no expiration
      reason_summary: input.justification,
      banning_level: "permanent",
      moderator_id: input.moderator.id,
    };
  }
}
