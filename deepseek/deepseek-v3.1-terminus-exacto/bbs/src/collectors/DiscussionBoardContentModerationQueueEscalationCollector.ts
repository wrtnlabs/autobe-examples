import { IDiscussionBoardContentModerationQueueEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueEscalation";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardContentModerationQueueEscalationCollector {
  export async function collect(props: {
    body: IDiscussionBoardContentModerationQueueEscalation.ICreate;
    discussionBoardContentModerationQueues: IEntity;
    discussionBoardAdmins: IEntity;
    discussionBoardSuperAdmins: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      escalation_type: props.body.escalation_type,
      previous_priority: props.body.previous_priority,
      new_priority: props.body.new_priority,
      escalation_reason: props.body.escalation_reason,
      workflow_state_before: props.body.workflow_state_before,
      workflow_state_after: props.body.workflow_state_after,
      escalation_timestamp: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      moderationQueue: {
        connect: { id: props.discussionBoardContentModerationQueues.id },
      },
      escalatedByAdmin: { connect: { id: props.discussionBoardAdmins.id } },
      escalatedBySuperAdmin: {
        connect: { id: props.discussionBoardSuperAdmins.id },
      },
      assignedToAdmin: props.body.assigned_to_admin_id
        ? { connect: { id: props.body.assigned_to_admin_id } }
        : undefined,
      assignedToSuperAdmin: props.body.assigned_to_super_admin_id
        ? { connect: { id: props.body.assigned_to_super_admin_id } }
        : undefined,
    } satisfies Prisma.discussion_board_content_moderation_queue_escalationsCreateInput;
  }
}
