import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardContentModerationQueueAssignmentAtSummaryTransformer } from "../transformers/DiscussionBoardContentModerationQueueAssignmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminContentFlagsContentFlagIdModerationQueuesQueueIdAssignments(props: {
  admin: AdminPayload;
  contentFlagId: string & tags.Format<"uuid">;
  queueId: string & tags.Format<"uuid">;
  body: IDiscussionBoardContentModerationQueueAssignment.IUpdate;
}): Promise<IDiscussionBoardContentModerationQueueAssignment.ISummary> {
  // Verify content flag exists and belongs to the specified moderation queue
  const queue =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.findFirst({
      where: {
        id: props.queueId,
        content_flag_id: props.contentFlagId,
      },
    });
  if (!queue) {
    throw new HttpException("Content flag or moderation queue not found", 404);
  }
  // Verify assignment exists for this queue
  const assignment =
    await MyGlobal.prisma.discussion_board_content_moderation_queue_assignments.findFirst(
      {
        where: {
          discussion_board_content_moderation_queue_id: props.queueId,
        },
        ...DiscussionBoardContentModerationQueueAssignmentAtSummaryTransformer.select(),
      },
    );
  if (!assignment) {
    throw new HttpException(
      "Assignment not found for this moderation queue",
      404,
    );
  }
  // If assigned_admin_id is provided, verify the admin exists
  if (
    props.body.assigned_admin_id !== undefined &&
    props.body.assigned_admin_id !== null
  ) {
    const targetAdmin = await MyGlobal.prisma.discussion_board_admins.findFirst(
      {
        where: {
          id: props.body.assigned_admin_id,
          deleted_at: null,
        },
      },
    );
    if (!targetAdmin) {
      throw new HttpException("Target administrator not found", 404);
    }
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_content_moderation_queue_assignmentsUpdateInput =
    {
      updated_at: toISOStringSafe(new Date()),
    };
  if (props.body.assigned_admin_id !== undefined) {
    if (props.body.assigned_admin_id === null) {
      // Since the relationship is required, we cannot disconnect it
      // Instead, we need to handle this differently - perhaps by setting a default admin
      // or throwing an error if null assignment is not allowed
      throw new HttpException(
        "Cannot unassign admin from required relationship",
        400,
      );
    } else {
      updateData.assignedAdmin = {
        connect: { id: props.body.assigned_admin_id },
      };
    }
  }
  if (props.body.completed_at !== undefined) {
    if (props.body.completed_at === null) {
      updateData.completed_at = null;
    } else {
      // Convert the ISO string to Date object for Prisma
      updateData.completed_at = new Date(props.body.completed_at);
    }
  }
  // Update the assignment
  const updatedAssignment =
    await MyGlobal.prisma.discussion_board_content_moderation_queue_assignments.update(
      {
        where: {
          id: assignment.id,
        },
        data: updateData,
        ...DiscussionBoardContentModerationQueueAssignmentAtSummaryTransformer.select(),
      },
    );
  return await DiscussionBoardContentModerationQueueAssignmentAtSummaryTransformer.transform(
    updatedAssignment,
  );
}
