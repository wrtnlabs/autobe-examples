import { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardContentModerationQueueAssignmentAtAdministratorAssignmentTransformer {
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
        } satisfies Prisma.discussion_board_content_flagsFindManyArgs,
        assignedAdmin: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_adminsFindManyArgs,
        escalatedByAdmin: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_adminsFindManyArgs,
        assignmentHistories: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_content_moderation_queue_assignmentsFindManyArgs,
        escalations: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_content_moderation_queue_escalationsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_content_moderation_queuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardContentModerationQueueAssignment.IAdministratorAssignment> {
    return {
      assigned_admin_id: input.assignedAdmin?.id ?? null,
    };
  }
}
