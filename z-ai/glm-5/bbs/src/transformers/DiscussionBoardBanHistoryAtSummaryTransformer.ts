import { IDiscussionBoardBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanHistory";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardBanHistoryAtSummaryTransformer {
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
      },
    } satisfies Prisma.discussion_board_ban_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardBanHistory.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      actionType: input.action_type,
      actor: input.actor
        ? await DiscussionBoardUserAtSummaryTransformer.transform(input.actor)
        : null,
      createdAt: input.created_at.toISOString(),
      targetUser: input.targetUser
        ? await DiscussionBoardUserAtSummaryTransformer.transform(
            input.targetUser,
          )
        : null,
    };
  }
}
