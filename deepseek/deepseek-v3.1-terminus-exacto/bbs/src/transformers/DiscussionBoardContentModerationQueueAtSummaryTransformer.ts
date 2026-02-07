import { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardContentModerationQueueAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_content_moderation_queuesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        moderation_status: true,
        priority_level: true,
        escalation_reason: true,
        assignment_history_count: true,
        auto_flagged: true,
        created_at: true,
        updated_at: true,
        assigned_at: true,
        resolved_at: true,
        contentFlag: {
          select: {
            id: true,
          },
        },
        assignedAdmin: {
          select: {
            id: true,
          },
        },
        escalatedByAdmin: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_content_moderation_queuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardContentModerationQueue.ISummary> {
    return {
      id: input.id,
      moderation_status: input.moderation_status,
      priority_level: input.priority_level,
      auto_flagged: input.auto_flagged,
      assignment_history_count: input.assignment_history_count,
      content_flag_id: input.contentFlag.id,
      assigned_admin_id: input.assignedAdmin?.id ?? null,
      created_at: toISOStringSafe(input.created_at),
      assigned_at: input.assigned_at
        ? toISOStringSafe(input.assigned_at)
        : null,
      resolved_at: input.resolved_at
        ? toISOStringSafe(input.resolved_at)
        : null,
    };
  }
}
