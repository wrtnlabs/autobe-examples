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

export async function putDiscussionBoardAdminContentFlagsContentFlagIdModerationQueuesQueueId(props: {
  admin: AdminPayload;
  contentFlagId: string & tags.Format<"uuid">;
  queueId: string & tags.Format<"uuid">;
  body: IDiscussionBoardContentModerationQueue.IUpdate;
}): Promise<IDiscussionBoardContentModerationQueue> {
  // First verify the queue entry exists and belongs to the content flag
  const existingQueue =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.findUnique(
      {
        where: {
          id: props.queueId,
          content_flag_id: props.contentFlagId,
        },
      },
    );
  if (!existingQueue) {
    throw new HttpException(
      "Moderation queue entry not found for the specified content flag",
      404,
    );
  }
  // Validate assigned_admin_id if provided
  if (
    props.body.assigned_admin_id !== undefined &&
    props.body.assigned_admin_id !== null
  ) {
    const adminExists =
      await MyGlobal.prisma.discussion_board_admins.findUnique({
        where: { id: props.body.assigned_admin_id },
      });
    if (!adminExists) {
      throw new HttpException("Assigned administrator not found", 400);
    }
  }
  // Validate moderation_status transitions
  const validStatusTransitions: Record<string, string[]> = {
    pending: ["under_review", "escalated", "dismissed"],
    under_review: ["pending", "escalated", "resolved", "dismissed"],
    escalated: ["under_review", "resolved", "dismissed"],
    resolved: [], // terminal state
    dismissed: [], // terminal state
  };
  if (
    props.body.moderation_status &&
    !validStatusTransitions[existingQueue.moderation_status]?.includes(
      props.body.moderation_status,
    )
  ) {
    throw new HttpException(
      `Invalid status transition from ${existingQueue.moderation_status} to ${props.body.moderation_status}`,
      400,
    );
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_content_moderation_queuesUpdateInput =
    {
      updated_at: toISOStringSafe(new Date()),
    };
  // Only update fields that are provided in the body
  if (props.body.assigned_admin_id !== undefined) {
    // Fix the type narrowing issue by explicitly checking for null
    if (props.body.assigned_admin_id !== null) {
      updateData.assignedAdmin = {
        connect: { id: props.body.assigned_admin_id },
      };
    }
    updateData.assigned_at = props.body.assigned_admin_id
      ? toISOStringSafe(new Date())
      : null;
  }
  if (props.body.moderation_status !== undefined) {
    updateData.moderation_status = props.body.moderation_status;
    if (["resolved", "dismissed"].includes(props.body.moderation_status)) {
      updateData.resolved_at = toISOStringSafe(new Date());
    }
  }
  if (props.body.priority_level !== undefined) {
    updateData.priority_level = props.body.priority_level;
  }
  if (props.body.escalation_reason !== undefined) {
    updateData.escalation_reason = props.body.escalation_reason;
  }
  // Update the moderation queue entry
  const updatedQueue =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.update({
      where: { id: props.queueId },
      data: updateData,
    });
  // Since IDiscussionBoardContentModerationQueue is empty, return empty object
  // This matches the DTO definition but may need adjustment based on actual requirements
  return {};
}
