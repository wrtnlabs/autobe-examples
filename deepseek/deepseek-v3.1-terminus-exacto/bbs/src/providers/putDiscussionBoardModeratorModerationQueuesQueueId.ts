import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationQueues } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationQueues";
import { IDiscussionBoardContentReports } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReports";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { IDiscussionBoardModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerators";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putDiscussionBoardModeratorModerationQueuesQueueId(props: {
  moderator: ModeratorPayload;
  queueId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModerationQueues.IUpdate;
}): Promise<IDiscussionBoardModerationQueues> {
  // Verify the queue entry exists
  const existingQueue =
    await MyGlobal.prisma.discussion_board_moderation_queues.findUnique({
      where: { id: props.queueId },
    });

  if (!existingQueue) {
    throw new HttpException("Moderation queue entry not found", 404);
  }

  // Verify moderator has permission to modify this queue entry
  if (
    existingQueue.discussion_board_moderator_id &&
    existingQueue.discussion_board_moderator_id !== props.moderator.id
  ) {
    throw new HttpException(
      "You are not authorized to modify this queue entry",
      403,
    );
  }

  // Validate moderator_id if provided
  if (props.body.moderator_id !== undefined) {
    const moderatorExists =
      await MyGlobal.prisma.discussion_board_moderators.findUnique({
        where: { id: props.body.moderator_id },
      });
    if (!moderatorExists) {
      throw new HttpException("Specified moderator not found", 400);
    }
  }

  // Validate content_report_id if provided
  if (props.body.content_report_id !== undefined) {
    const contentReportExists =
      await MyGlobal.prisma.discussion_board_content_reports.findUnique({
        where: { id: props.body.content_report_id },
      });
    if (!contentReportExists) {
      throw new HttpException("Specified content report not found", 400);
    }
  }

  // Validate workflow state transitions
  if (
    props.body.completed_at &&
    !existingQueue.started_at &&
    !props.body.started_at
  ) {
    throw new HttpException(
      "Cannot mark as completed before starting review",
      400,
    );
  }

  if (props.body.started_at && existingQueue.completed_at) {
    throw new HttpException("Cannot restart a completed review", 400);
  }

  // Build update data with proper null/undefined handling
  const updateData: Prisma.discussion_board_moderation_queuesUpdateInput = {
    ...(props.body.queue_type !== undefined && {
      queue_type: props.body.queue_type,
    }),
    ...(props.body.position !== undefined && { position: props.body.position }),
    ...(props.body.assigned_at !== undefined && {
      assigned_at: props.body.assigned_at,
    }),
    ...(props.body.started_at !== undefined && {
      started_at: props.body.started_at,
    }),
    ...(props.body.completed_at !== undefined && {
      completed_at: props.body.completed_at,
    }),
    ...(props.body.timeout_at !== undefined && {
      timeout_at: props.body.timeout_at,
    }),
    ...(props.body.content_report_id !== undefined && {
      discussion_board_content_report_id: props.body.content_report_id,
    }),
    ...(props.body.moderator_id !== undefined && {
      discussion_board_moderator_id: props.body.moderator_id,
    }),
    updated_at: toISOStringSafe(new Date()),
  };

  // Perform the update
  const updated =
    await MyGlobal.prisma.discussion_board_moderation_queues.update({
      where: { id: props.queueId },
      data: updateData,
    });

  // Fetch related data separately
  const contentReport = updated.discussion_board_content_report_id
    ? await MyGlobal.prisma.discussion_board_content_reports.findUnique({
        where: { id: updated.discussion_board_content_report_id },
      })
    : null;

  const moderator = updated.discussion_board_moderator_id
    ? await MyGlobal.prisma.discussion_board_moderators.findUnique({
        where: { id: updated.discussion_board_moderator_id },
      })
    : null;

  // Transform to API response format
  return {
    id: updated.id,
    queue_type: updated.queue_type,
    position: updated.position,
    assigned_at: updated.assigned_at
      ? toISOStringSafe(updated.assigned_at)
      : undefined,
    started_at: updated.started_at
      ? toISOStringSafe(updated.started_at)
      : undefined,
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : undefined,
    timeout_at: updated.timeout_at
      ? toISOStringSafe(updated.timeout_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    contentReport: contentReport
      ? {
          id: contentReport.id,
          report_type: contentReport.actor_type,
          status: contentReport.status,
          created_at: toISOStringSafe(contentReport.created_at),
          reporter: {
            id: contentReport.id,
            type: contentReport.actor_type,
            name: "Reporter",
          },
          content: {
            id: contentReport.id,
            type: contentReport.actor_type,
            title: `Report: ${contentReport.report_reason}`,
          },
        }
      : undefined,
    moderator: moderator
      ? {
          id: moderator.id,
          username: moderator.username,
          email: moderator.email,
          display_name: moderator.display_name || moderator.username,
          role: moderator.moderation_level,
          is_active: moderator.deleted_at === null,
        }
      : undefined,
  };
}
