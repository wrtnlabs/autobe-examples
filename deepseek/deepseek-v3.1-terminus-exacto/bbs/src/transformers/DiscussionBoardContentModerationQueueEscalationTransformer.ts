import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import { IDiscussionBoardContentModerationQueueEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueEscalation";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardContentModerationQueueAtSummaryTransformer } from "./DiscussionBoardContentModerationQueueAtSummaryTransformer";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "./DiscussionBoardSuperAdminAtSummaryTransformer";

export namespace DiscussionBoardContentModerationQueueEscalationTransformer {
  export type Payload =
    Prisma.discussion_board_content_moderation_queue_escalationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        escalation_type: true,
        previous_priority: true,
        new_priority: true,
        escalation_reason: true,
        workflow_state_before: true,
        workflow_state_after: true,
        escalation_timestamp: true,
        created_at: true,
        updated_at: true,
        moderationQueue:
          DiscussionBoardContentModerationQueueAtSummaryTransformer.select(),
        escalatedByAdmin: DiscussionBoardAdminAtSummaryTransformer.select(),
        escalatedBySuperAdmin:
          DiscussionBoardSuperAdminAtSummaryTransformer.select(),
        assignedToAdmin: DiscussionBoardAdminAtSummaryTransformer.select(),
        assignedToSuperAdmin:
          DiscussionBoardSuperAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_content_moderation_queue_escalationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardContentModerationQueueEscalation> {
    return {
      id: input.id,
      escalationType: input.escalation_type,
      previousPriority: input.previous_priority,
      newPriority: input.new_priority,
      escalationReason: input.escalation_reason,
      workflowStateBefore: input.workflow_state_before,
      workflowStateAfter: input.workflow_state_after,
      escalationTimestamp: input.escalation_timestamp.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      escalatedByAdmin: input.escalatedByAdmin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(
            input.escalatedByAdmin,
          )
        : null,
      escalatedBySuperAdmin: input.escalatedBySuperAdmin
        ? await DiscussionBoardSuperAdminAtSummaryTransformer.transform(
            input.escalatedBySuperAdmin,
          )
        : null,
      assignedToAdmin: input.assignedToAdmin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(
            input.assignedToAdmin,
          )
        : null,
      assignedToSuperAdmin: input.assignedToSuperAdmin
        ? await DiscussionBoardSuperAdminAtSummaryTransformer.transform(
            input.assignedToSuperAdmin,
          )
        : null,
      moderationQueue:
        await DiscussionBoardContentModerationQueueAtSummaryTransformer.transform(
          input.moderationQueue,
        ),
    };
  }
}
