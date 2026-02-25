import { IDiscussionBoardContentModerationQueueEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueEscalation";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardContentModerationQueueEscalationCollector } from "../collectors/DiscussionBoardContentModerationQueueEscalationCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postDiscussionBoardAdminQueuesQueueIdEscalate(props: {
  admin: AdminPayload;
  queueId: string & tags.Format<"uuid">;
  body: IDiscussionBoardContentModerationQueueEscalation.ICreate;
}): Promise<IDiscussionBoardContentModerationQueueEscalation> {
  // 1. Validate the queue exists
  const queue =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.findUniqueOrThrow(
      {
        where: { id: props.queueId },
      },
    );
  // 2. Validate assignment fields based on escalation type
  if (props.body.escalation_type === "reassignment") {
    if (
      !props.body.assigned_to_admin_id &&
      !props.body.assigned_to_super_admin_id
    ) {
      throw new HttpException(
        "Reassignment escalation requires assignment to admin or super admin",
        400,
      );
    }
    // Validate assigned admin exists if provided
    if (props.body.assigned_to_admin_id) {
      const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
        where: { id: props.body.assigned_to_admin_id },
      });
      if (!admin) {
        throw new HttpException("Assigned admin not found", 400);
      }
    }
    // Validate assigned super admin exists if provided
    if (props.body.assigned_to_super_admin_id) {
      const superAdmin =
        await MyGlobal.prisma.discussion_board_super_admins.findUnique({
          where: { id: props.body.assigned_to_super_admin_id },
        });
      if (!superAdmin) {
        throw new HttpException("Assigned super admin not found", 400);
      }
    }
  }
  // 3. Update the parent queue with new priority and assignment
  const assignedAdminId =
    props.body.assigned_to_admin_id ?? props.body.assigned_to_super_admin_id;
  await MyGlobal.prisma.discussion_board_content_moderation_queues.update({
    where: { id: props.queueId },
    data: {
      assigned_admin_id: assignedAdminId || null,
      moderation_status: props.body.workflow_state_after, // Fixed: use moderation_status instead of workflow_state
      updated_at: toISOStringSafe(new Date()), // Use toISOStringSafe for Date conversion
    },
  });
  // 4. Create escalation record using collector
  const escalationData =
    await DiscussionBoardContentModerationQueueEscalationCollector.collect({
      body: props.body,
      discussionBoardContentModerationQueues: { id: props.queueId },
      discussionBoardAdmins: { id: props.admin.id },
      discussionBoardSuperAdmins: { id: props.admin.id }, // Use admin ID for both
    });
  const escalation =
    await MyGlobal.prisma.discussion_board_content_moderation_queue_escalations.create(
      {
        data: escalationData,
      },
    );
  // 5. Get analytics data for the response
  const totalEscalations =
    await MyGlobal.prisma.discussion_board_content_moderation_queue_escalations.count(
      {
        where: { escalation_reason: props.body.escalation_reason },
      },
    );
  const allEscalations =
    await MyGlobal.prisma.discussion_board_content_moderation_queue_escalations.count();
  const percentage =
    allEscalations > 0 ? (totalEscalations * 100.0) / allEscalations : 100.0;
  // 6. Return the analytics response structure
  return {
    reason: escalation.escalation_reason,
    count: totalEscalations,
    percentage: percentage,
  };
}
