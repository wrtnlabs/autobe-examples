import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import { IDiscussionBoardContentModerationQueueEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueEscalation";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardContentModerationQueueEscalationTransformer } from "../transformers/DiscussionBoardContentModerationQueueEscalationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminContentFlagsContentFlagIdModerationQueuesQueueIdEscalations(props: {
  admin: AdminPayload;
  contentFlagId: string & tags.Format<"uuid">;
  queueId: string & tags.Format<"uuid">;
  body: IDiscussionBoardContentModerationQueueEscalation.IUpdate;
}): Promise<IDiscussionBoardContentModerationQueueEscalation> {
  // This operation updates escalation records within a moderation queue.
  // However, the current implementation lacks a specific escalation identifier.
  // Typically, there should be an escalationId parameter to identify which escalation to update.
  // Since the operation specification doesn't include an escalation identifier,
  // this suggests we might be updating the most recent or active escalation.
  // Let's implement by finding the most recent escalation for the given queue.
  const escalation =
    await MyGlobal.prisma.discussion_board_content_moderation_queue_escalations.findFirst(
      {
        where: {
          discussion_board_content_moderation_queue_id: props.queueId,
          moderationQueue: {
            id: props.queueId,
            content_flag_id: props.contentFlagId,
          },
        },
        orderBy: { escalation_timestamp: "desc" },
        ...DiscussionBoardContentModerationQueueEscalationTransformer.select(),
      },
    );
  if (!escalation) {
    throw new HttpException(
      "No escalation records found for this moderation queue",
      404,
    );
  }
  // Authorization check - fixed property access
  const isAuthorized =
    (escalation.assignedToAdmin &&
      escalation.assignedToAdmin.id === props.admin.id) ||
    (escalation.escalatedByAdmin &&
      escalation.escalatedByAdmin.id === props.admin.id) ||
    (escalation.escalatedBySuperAdmin &&
      escalation.escalatedBySuperAdmin.id === props.admin.id);
  if (!isAuthorized) {
    throw new HttpException("Not authorized to modify this escalation", 403);
  }
  // Build update data
  const updateData: any = {
    updated_at: toISOStringSafe(new Date()),
  };
  // Map DTO fields to database columns
  if (props.body.escalation_type !== undefined) {
    updateData.escalation_type = props.body.escalation_type;
  }
  if (props.body.previous_priority !== undefined) {
    updateData.previous_priority = props.body.previous_priority;
  }
  if (props.body.new_priority !== undefined) {
    updateData.new_priority = props.body.new_priority;
  }
  if (props.body.assigned_to_admin_id !== undefined) {
    updateData.assigned_to_admin_id = props.body.assigned_to_admin_id;
  }
  if (props.body.assigned_to_super_admin_id !== undefined) {
    updateData.assigned_to_super_admin_id =
      props.body.assigned_to_super_admin_id;
  }
  if (props.body.escalation_reason !== undefined) {
    updateData.escalation_reason = props.body.escalation_reason;
  }
  if (props.body.workflow_state_before !== undefined) {
    updateData.workflow_state_before = props.body.workflow_state_before;
  }
  if (props.body.workflow_state_after !== undefined) {
    updateData.workflow_state_after = props.body.workflow_state_after;
  }
  const updated =
    await MyGlobal.prisma.discussion_board_content_moderation_queue_escalations.update(
      {
        where: { id: escalation.id },
        data: updateData,
        ...DiscussionBoardContentModerationQueueEscalationTransformer.select(),
      },
    );
  return await DiscussionBoardContentModerationQueueEscalationTransformer.transform(
    updated,
  );
}
