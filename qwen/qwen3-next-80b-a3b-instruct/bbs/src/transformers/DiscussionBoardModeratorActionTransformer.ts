import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardModeratorAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorAction";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { DiscussionBoardModeratorAtSummaryTransformer } from "./DiscussionBoardModeratorAtSummaryTransformer";
import { DiscussionBoardModeratorActionAtSummaryTransformer } from "./DiscussionBoardModeratorActionAtSummaryTransformer";

export namespace DiscussionBoardModeratorActionTransformer {
  export type Payload = Prisma.discussion_board_moderator_actionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target_type: true,
        target_id: true,
        status: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        moderator: DiscussionBoardModeratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_moderator_actionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardModeratorAction> {
    return {
      id: input.id,
      moderator_id: input.moderator.id,
      action_type: input.status as "warn" | "remove" | "dismiss" | "suspend",
      target_content_id: input.target_id,
      target_content_type: input.target_type as
        | "article"
        | "comment"
        | "attachment"
        | "user"
        | "report"
        | "channel",
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      target_content_summary:
        await DiscussionBoardModeratorActionAtSummaryTransformer.transform(
          input,
        ),
      moderator_summary:
        await DiscussionBoardModeratorAtSummaryTransformer.transform(
          input.moderator,
        ),
    };
  }
}
