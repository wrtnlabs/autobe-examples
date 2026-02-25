import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { IDiscussionBoardBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanHistory";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardBanAtSummaryTransformer } from "./DiscussionBoardBanAtSummaryTransformer";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardBanHistoryTransformer {
  export type Payload = Prisma.discussion_board_ban_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        reason: true,
        created_at: true,
        targetUser: DiscussionBoardUserAtSummaryTransformer.select(),
        actor: DiscussionBoardUserAtSummaryTransformer.select(),
        ban: DiscussionBoardBanAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_ban_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardBanHistory> {
    return {
      id: input.id,
      actionType: input.action_type,
      reason: input.reason,
      createdAt: input.created_at.toISOString(),
      ban:
        input.ban !== null
          ? await DiscussionBoardBanAtSummaryTransformer.transform(input.ban)
          : null,
      targetUser:
        input.targetUser !== null
          ? await DiscussionBoardUserAtSummaryTransformer.transform(
              input.targetUser,
            )
          : null,
      actor:
        input.actor !== null
          ? await DiscussionBoardUserAtSummaryTransformer.transform(input.actor)
          : null,
    };
  }
}
