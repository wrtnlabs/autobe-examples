import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationQueue";
import { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorModerationQueuesQueueId(props: {
  moderator: ModeratorPayload;
  queueId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerationQueue> {
  // Find the moderation queue entry by ID
  const queueEntry =
    await MyGlobal.prisma.discussion_board_moderation_queues.findFirst({
      where: {
        id: props.queueId,
        deleted_at: null,
      },
    });

  if (!queueEntry) {
    throw new HttpException("Moderation queue entry not found", 404);
  }

  // Find the related content report
  const contentReport =
    await MyGlobal.prisma.discussion_board_content_reports.findFirst({
      where: {
        id: queueEntry.discussion_board_content_report_id,
        deleted_at: null,
      },
    });

  // Return the queue entry with proper date conversions
  return {
    id: queueEntry.id,
    discussion_board_content_report_id:
      queueEntry.discussion_board_content_report_id,
    queue_type: queueEntry.queue_type,
    position: queueEntry.position,
    assigned_at: queueEntry.assigned_at
      ? toISOStringSafe(queueEntry.assigned_at)
      : undefined,
    started_at: queueEntry.started_at
      ? toISOStringSafe(queueEntry.started_at)
      : undefined,
    completed_at: queueEntry.completed_at
      ? toISOStringSafe(queueEntry.completed_at)
      : undefined,
    timeout_at: queueEntry.timeout_at
      ? toISOStringSafe(queueEntry.timeout_at)
      : undefined,
    created_at: toISOStringSafe(queueEntry.created_at),
    updated_at: toISOStringSafe(queueEntry.updated_at),
    contentReport: contentReport
      ? {
          id: contentReport.id,
          actor: {
            id: contentReport.id, // Simplified actor ID
            type: contentReport.actor_type,
            name: `${contentReport.actor_type} Actor`,
          },
          content: {
            id: contentReport.id, // Simplified content ID
            type: "post", // Default content type
            title: "Reported Content", // Default title
          },
          report_reason: contentReport.report_reason,
          status: contentReport.status,
          priority: contentReport.priority,
          report_details: contentReport.report_details ?? undefined,
          created_at: toISOStringSafe(contentReport.created_at),
          updated_at: toISOStringSafe(contentReport.updated_at),
        }
      : undefined,
  };
}
