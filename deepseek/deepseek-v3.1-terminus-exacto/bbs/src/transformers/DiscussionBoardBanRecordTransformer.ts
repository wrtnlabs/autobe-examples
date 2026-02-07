import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardBanRecordTransformer {
  export type Payload = Prisma.discussion_board_ban_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ban_reason: true,
        ban_duration_days: true,
        ban_status: true,
        expires_at: true,
        revoked_at: true,
        revoked_reason: true,
        created_at: true,
        updated_at: true,
        // Removed non-existent relation fields
      },
    } satisfies Prisma.discussion_board_ban_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardBanRecord> {
    return {
      id: input.id,
      ban_reason: input.ban_reason,
      ban_duration_days: input.ban_duration_days ?? null,
      ban_status: input.ban_status,
      expires_at: input.expires_at ? toISOStringSafe(input.expires_at) : null,
      revoked_at: input.revoked_at ? toISOStringSafe(input.revoked_at) : null,
      revoked_reason: input.revoked_reason ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
