import { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminContentFlagsContentFlagIdModerationQueues(props: {
  superAdmin: SuperadminPayload;
  contentFlagId: string & tags.Format<"uuid">;
  body: IDiscussionBoardContentModerationQueue.IUpdate;
}): Promise<IDiscussionBoardContentModerationQueue> {
  // Verify content flag exists
  const contentFlag =
    await MyGlobal.prisma.discussion_board_content_flags.findUnique({
      where: { id: props.contentFlagId },
    });
  if (!contentFlag) {
    throw new HttpException("Content flag not found", 404);
  }
  // Find the associated moderation queue
  const moderationQueue =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.findUnique(
      {
        where: { content_flag_id: props.contentFlagId },
      },
    );
  if (!moderationQueue) {
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
    const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
      where: { id: props.body.assigned_admin_id },
    });
    if (!admin) {
      throw new HttpException("Assigned administrator not found", 404);
    }
  }
  // Build update data with only provided fields
  const updateData: Prisma.discussion_board_content_moderation_queuesUpdateInput =
    {
      updated_at: toISOStringSafe(new Date()),
    };
  if (props.body.assigned_admin_id !== undefined) {
    if (props.body.assigned_admin_id === null) {
      updateData.assignedAdmin = { disconnect: true };
      updateData.assigned_at = null;
      updateData.assignment_history_count = { increment: 1 };
    } else {
      updateData.assignedAdmin = {
        connect: { id: props.body.assigned_admin_id },
      };
      updateData.assigned_at = toISOStringSafe(new Date());
      updateData.assignment_history_count = { increment: 1 };
    }
  }
  if (props.body.moderation_status !== undefined) {
    updateData.moderation_status = props.body.moderation_status;
  }
  if (props.body.priority_level !== undefined) {
    updateData.priority_level = props.body.priority_level;
  }
  if (props.body.escalation_reason !== undefined) {
    updateData.escalation_reason = props.body.escalation_reason;
  }
  // Update the moderation queue
  const updated =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.update({
      where: { id: moderationQueue.id },
      data: updateData,
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
    });
  // Transform to response DTO
  return {
    id: updated.id,
    content_flag_id: updated.contentFlag.id,
    assigned_admin_id: updated.assignedAdmin?.id ?? null,
    escalated_by_admin_id: updated.escalatedByAdmin?.id ?? null,
    moderation_status: updated.moderation_status,
    priority_level: updated.priority_level,
    escalation_reason: updated.escalation_reason,
    assignment_history_count: updated.assignment_history_count,
    auto_flagged: updated.auto_flagged,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    assigned_at: updated.assigned_at
      ? toISOStringSafe(updated.assigned_at)
      : null,
    resolved_at: updated.resolved_at
      ? toISOStringSafe(updated.resolved_at)
      : null,
  };
}
