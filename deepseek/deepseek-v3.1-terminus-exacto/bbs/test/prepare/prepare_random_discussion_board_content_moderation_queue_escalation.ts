import { IDiscussionBoardContentModerationQueueEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueEscalation";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_content_moderation_queue_escalation(
  input?: DeepPartial<IDiscussionBoardContentModerationQueueEscalation.ICreate>,
): IDiscussionBoardContentModerationQueueEscalation.ICreate {
  return {
    escalation_type:
      input?.escalation_type ??
      RandomGenerator.pick([
        "priority_increase",
        "reassignment",
        "workflow_transition",
      ] as const),
    previous_priority:
      input?.previous_priority ??
      RandomGenerator.pick(["low", "medium", "high", "urgent"] as const),
    new_priority:
      input?.new_priority ??
      RandomGenerator.pick(["low", "medium", "high", "urgent"] as const),
    escalation_reason:
      input?.escalation_reason ?? RandomGenerator.paragraph({ sentences: 2 }),
    workflow_state_before:
      input?.workflow_state_before ??
      RandomGenerator.pick([
        "pending",
        "in_review",
        "escalated",
        "resolved",
      ] as const),
    workflow_state_after:
      input?.workflow_state_after ??
      RandomGenerator.pick([
        "pending",
        "in_review",
        "escalated",
        "resolved",
      ] as const),
    assigned_to_admin_id:
      input?.assigned_to_admin_id ??
      typia.random<string & tags.Format<"uuid">>(),
    assigned_to_super_admin_id:
      input?.assigned_to_super_admin_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
