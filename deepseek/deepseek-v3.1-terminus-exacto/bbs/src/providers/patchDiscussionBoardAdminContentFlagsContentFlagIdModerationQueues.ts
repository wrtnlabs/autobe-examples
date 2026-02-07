import { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminContentFlagsContentFlagIdModerationQueues(props: {
  admin: AdminPayload;
  contentFlagId: string & tags.Format<"uuid">;
  body: IDiscussionBoardContentModerationQueue.IUpdate;
}): Promise<IDiscussionBoardContentModerationQueue> {
  // Validate content flag exists
  const contentFlag =
    await MyGlobal.prisma.discussion_board_content_flags.findUnique({
      where: { id: props.contentFlagId },
    });
  if (!contentFlag) {
    throw new HttpException("Content flag not found", 404);
  }
  // Validate moderation queue exists for this content flag
  const existingQueue =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.findUnique(
      {
        where: { content_flag_id: props.contentFlagId },
      },
    );
  if (!existingQueue) {
    throw new HttpException(
      "Moderation queue not found for this content flag",
      404,
    );
  }
  // Validate assigned admin exists if provided
  if (
    props.body.assigned_admin_id !== undefined &&
    props.body.assigned_admin_id !== null
  ) {
    const adminExists =
      await MyGlobal.prisma.discussion_board_admins.findUnique({
        where: { id: props.body.assigned_admin_id },
      });
    if (!adminExists) {
      throw new HttpException("Assigned administrator not found", 404);
    }
  }
  // Build update data
  const updateData: Prisma.discussion_board_content_moderation_queuesUpdateInput =
    {};
  // Handle assignment changes
  if (props.body.assigned_admin_id !== undefined) {
    if (props.body.assigned_admin_id === null) {
      // Unassigning - set to null using disconnect
      updateData.assignedAdmin = { disconnect: true };
    } else {
      // Assigning to specific admin
      updateData.assignedAdmin = {
        connect: { id: props.body.assigned_admin_id },
      };
    }
    // Update assignment timestamp and increment history count
    updateData.assigned_at = toISOStringSafe(new Date());
    updateData.assignment_history_count =
      existingQueue.assignment_history_count + 1;
  }
  // Handle other field updates
  if (props.body.moderation_status !== undefined) {
    updateData.moderation_status = props.body.moderation_status;
  }
  if (props.body.priority_level !== undefined) {
    updateData.priority_level = props.body.priority_level;
  }
  if (props.body.escalation_reason !== undefined) {
    updateData.escalation_reason = props.body.escalation_reason;
  }
  // Always update the updated_at timestamp
  updateData.updated_at = toISOStringSafe(new Date());
  const updatedQueue =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.update({
      where: { content_flag_id: props.contentFlagId },
      data: updateData,
      select: {
        id: true,
        content_flag_id: true,
        assigned_admin_id: true,
        escalated_by_admin_id: true,
        moderation_status: true,
        priority_level: true,
        escalation_reason: true,
        assignment_history_count: true,
        auto_flagged: true,
        created_at: true,
        updated_at: true,
        assigned_at: true,
        resolved_at: true,
      },
    });
  return {
    id: updatedQueue.id,
    content_flag_id: updatedQueue.content_flag_id,
    assigned_admin_id:
      updatedQueue.assigned_admin_id === null
        ? undefined
        : updatedQueue.assigned_admin_id,
    escalated_by_admin_id:
      updatedQueue.escalated_by_admin_id === null
        ? undefined
        : updatedQueue.escalated_by_admin_id,
    moderation_status: updatedQueue.moderation_status,
    priority_level: updatedQueue.priority_level,
    escalation_reason:
      updatedQueue.escalation_reason === null
        ? undefined
        : updatedQueue.escalation_reason,
    assignment_history_count: updatedQueue.assignment_history_count,
    auto_flagged: updatedQueue.auto_flagged,
    created_at: toISOStringSafe(updatedQueue.created_at),
    updated_at: toISOStringSafe(updatedQueue.updated_at),
    assigned_at:
      updatedQueue.assigned_at === null
        ? undefined
        : toISOStringSafe(updatedQueue.assigned_at),
    resolved_at:
      updatedQueue.resolved_at === null
        ? undefined
        : toISOStringSafe(updatedQueue.resolved_at),
  };
}
