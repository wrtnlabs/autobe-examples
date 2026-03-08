import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardGuestAtSummaryTransformer } from "./DiscussionBoardGuestAtSummaryTransformer";

export namespace DiscussionBoardBanRecordTransformer {
  export type Payload = Prisma.discussion_board_ban_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        user: DiscussionBoardGuestAtSummaryTransformer.select(),
        administrator: DiscussionBoardGuestAtSummaryTransformer.select(),
        ban_reason: true,
        unban_reason: true,
        banned_at: true,
        unbanned_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_ban_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardBanRecord> {
    return {
      id: input.id,
      user: await DiscussionBoardGuestAtSummaryTransformer.transform(
        input.user,
      ),
      administrator: await DiscussionBoardGuestAtSummaryTransformer.transform(
        input.administrator,
      ),
      ban_reason: input.ban_reason,
      unban_reason: input.unban_reason ?? undefined,
      banned_at: input.banned_at.toISOString(),
      unbanned_at: input.unbanned_at?.toISOString() ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
