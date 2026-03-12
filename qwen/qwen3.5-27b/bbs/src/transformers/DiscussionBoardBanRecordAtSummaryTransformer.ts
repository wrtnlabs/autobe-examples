import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdministratorAtSummaryTransformer } from "./DiscussionBoardAdministratorAtSummaryTransformer";

export namespace DiscussionBoardBanRecordAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_ban_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        ban_reason: true,
        banned_at: true,
        unbanned_at: true,
        bannedBy: DiscussionBoardAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_ban_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardBanRecord.ISummary> {
    return {
      id: input.id,
      actor_type: input.actor_type,
      ban_reason: input.ban_reason,
      banned_at: input.banned_at.toISOString(),
      unbanned_at: input.unbanned_at?.toISOString() ?? null,
      bannedBy:
        await DiscussionBoardAdministratorAtSummaryTransformer.transform(
          input.bannedBy,
        ),
    };
  }
}
