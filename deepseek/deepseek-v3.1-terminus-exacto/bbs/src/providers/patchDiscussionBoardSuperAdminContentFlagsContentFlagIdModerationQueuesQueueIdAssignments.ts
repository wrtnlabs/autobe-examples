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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardContentModerationQueueAssignmentAtSummaryTransformer } from "../transformers/DiscussionBoardContentModerationQueueAssignmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardSuperAdminContentFlagsContentFlagIdModerationQueuesQueueIdAssignments(props: {
  superAdmin: SuperadminPayload;
  contentFlagId: string & tags.Format<"uuid">;
  queueId: string & tags.Format<"uuid">;
  body: IDiscussionBoardContentModerationQueueAssignment.IUpdate;
}): Promise<IDiscussionBoardContentModerationQueueAssignment.ISummary> {
  // Verify content flag exists
  const contentFlag =
    await MyGlobal.prisma.discussion_board_content_flags.findUnique({
      where: { id: props.contentFlagId },
    });
  if (!contentFlag) {
    throw new HttpException("Content flag not found", 404);
  }
  // Verify moderation queue exists and belongs to content flag
  const moderationQueue =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.findUnique(
      {
        where: {
          id: props.queueId,
          content_flag_id: props.contentFlagId,
        },
      },
    );
  if (!moderationQueue) {
    throw new HttpException(
      "Moderation queue not found or does not belong to the specified content flag",
      404,
    );
  }
  // Find the assignment for this queue
  const assignment =
    await MyGlobal.prisma.discussion_board_content_moderation_queue_assignments.findFirst(
      {
        where: {
          discussion_board_content_moderation_queue_id: props.queueId,
        },
      },
    );
  if (!assignment) {
    throw new HttpException(
      "Assignment not found for this moderation queue",
      404,
    );
  }
  // Prepare update data with proper Prisma types
  const updateData: Prisma.discussion_board_content_moderation_queue_assignmentsUpdateInput =
    {
      updated_at: toISOStringSafe(new Date()),
    };
  // Handle assigned_admin_id update with validation
  if (props.body.assigned_admin_id !== undefined) {
    if (props.body.assigned_admin_id === null) {
      // Since assigned_admin_id is required field, cannot set to null
      throw new HttpException("Assigned administrator cannot be null", 400);
    } else {
      // Verify the admin exists
      const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
        where: { id: props.body.assigned_admin_id },
      });
      if (!admin) {
        throw new HttpException("Assigned administrator not found", 404);
      }
      updateData.assignedAdmin = {
        connect: { id: props.body.assigned_admin_id },
      };
    }
  }
  // Handle completed_at update
  if (props.body.completed_at !== undefined) {
    if (props.body.completed_at === null) {
      updateData.completed_at = null;
    } else {
      updateData.completed_at = toISOStringSafe(
        new Date(props.body.completed_at),
      );
    }
  }
  // Update assignment
  const updatedAssignment =
    await MyGlobal.prisma.discussion_board_content_moderation_queue_assignments.update(
      {
        where: { id: assignment.id },
        data: updateData,
        ...DiscussionBoardContentModerationQueueAssignmentAtSummaryTransformer.select(),
      },
    );
  return await DiscussionBoardContentModerationQueueAssignmentAtSummaryTransformer.transform(
    updatedAssignment,
  );
}
