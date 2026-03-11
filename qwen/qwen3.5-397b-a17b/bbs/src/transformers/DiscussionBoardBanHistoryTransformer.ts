import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { IDiscussionBoardBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanHistory";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardBanAtSummaryTransformer } from "./DiscussionBoardBanAtSummaryTransformer";

export namespace DiscussionBoardBanHistoryTransformer {
  export type Payload = Prisma.discussion_board_ban_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        reason: true,
        created_at: true,
        ban: DiscussionBoardBanAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_ban_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardBanHistory> {
    return {
      id: input.id,
      action: input.action,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      ban: await DiscussionBoardBanAtSummaryTransformer.transform(input.ban),
    };
  }
}
