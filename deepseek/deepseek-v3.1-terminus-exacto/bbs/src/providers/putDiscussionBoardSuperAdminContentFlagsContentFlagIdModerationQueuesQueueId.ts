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

export async function putDiscussionBoardSuperAdminContentFlagsContentFlagIdModerationQueuesQueueId(props: {
  superAdmin: SuperadminPayload;
  contentFlagId: string & tags.Format<"uuid">;
  queueId: string & tags.Format<"uuid">;
  body: IDiscussionBoardContentModerationQueue.IUpdate;
}): Promise<IDiscussionBoardContentModerationQueue> {
  // Verify the queue exists and belongs to the specified contentFlagId
  const existingQueue =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.findUnique(
      {
        where: { id: props.queueId },
      },
    );
  if (!existingQueue) {
    throw new HttpException("Moderation queue entry not found", 404);
  }
  if (existingQueue.content_flag_id !== props.contentFlagId) {
    throw new HttpException(
      "Moderation queue entry does not belong to the specified content flag",
      400,
    );
  }
  // Validate assigned_admin_id references existing admin if provided
  if (
    props.body.assigned_admin_id !== undefined &&
    props.body.assigned_admin_id !== null
  ) {
    const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
      where: { id: props.body.assigned_admin_id, deleted_at: null },
    });
    if (!admin) {
      throw new HttpException("Assigned administrator not found", 400);
    }
  }
  // Build update data with only allowed fields
  const updateData: Prisma.discussion_board_content_moderation_queuesUpdateInput =
    {
      ...(props.body.assigned_admin_id !== undefined && {
        assigned_admin_id: props.body.assigned_admin_id,
      }),
      ...(props.body.moderation_status !== undefined && {
        moderation_status: props.body.moderation_status,
      }),
      ...(props.body.priority_level !== undefined && {
        priority_level: props.body.priority_level,
      }),
      ...(props.body.escalation_reason !== undefined && {
        escalation_reason: props.body.escalation_reason,
      }),
      updated_at: toISOStringSafe(new Date()),
      ...(props.body.assigned_admin_id !== undefined &&
        props.body.assigned_admin_id !== null && {
          assigned_at: toISOStringSafe(new Date()),
        }),
    };
  // Perform the update
  const updatedQueue =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.update({
      where: { id: props.queueId },
      data: updateData,
    });
  // Since IDiscussionBoardContentModerationQueue is an empty type,
  // return the updated queue data directly
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
  } as IDiscussionBoardContentModerationQueue;
}
