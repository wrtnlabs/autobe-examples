import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardCommentModAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModAction";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { DiscussionBoardModeratorAtSummaryTransformer } from "./DiscussionBoardModeratorAtSummaryTransformer";

export namespace DiscussionBoardCommentModActionAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_comment_mod_actionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        actionType: {
          select: {
            id: true,
            type: true,
            status: true,
            reason: true,
          },
        },
        moderator: DiscussionBoardModeratorAtSummaryTransformer.select(),
        comment: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_comment_mod_actionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentModAction.ISummary> {
    return {
      id: input.id,
      action_type: input.actionType.type as
        | "hide"
        | "delete"
        | "warn"
        | "approve"
        | "unhide"
        | "restore"
        | "lock"
        | "unlock"
        | "pin"
        | "unpin",
      reason: input.actionType.reason ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      moderator: await DiscussionBoardModeratorAtSummaryTransformer.transform(
        input.moderator,
      ),
      status: input.actionType.status as "pending" | "completed" | "reversed",
    };
  }
}
