import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardModeratorAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorAction";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardModeratorActionAtSummaryTransformer {
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
        moderator: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_moderator_actionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardModeratorAction.ISummary> {
    return {
      id: input.id,
      action: "", // Default value as no corresponding DB field
      reason: input.reason,
      target_id: input.target_id,
      target_type: input.target_type,
      actor_id: input.moderator.id,
      timestamp: input.created_at.toISOString(),
      status: input.status,
      has_appeal: false, // Default value as no corresponding DB field
      is_system_generated: false, // Default value as no corresponding DB field
    };
  }
}
