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
import { DiscussionBoardContentModerationQueueAssignmentCollector } from "../collectors/DiscussionBoardContentModerationQueueAssignmentCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardContentModerationQueueAssignmentTransformer } from "../transformers/DiscussionBoardContentModerationQueueAssignmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminModerationQueuesAssignments(props: {
  admin: AdminPayload;
  body: IDiscussionBoardContentModerationQueueAssignment.ICreate;
}): Promise<IDiscussionBoardContentModerationQueueAssignment> {
  // Validate that the content moderation queue exists and is active
  const queue =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.findUnique(
      {
        where: {
          id: props.body.discussion_board_content_moderation_queue_id,
          resolved_at: null, // Only assign to unresolved queues
        },
      },
    );
  if (!queue) {
    throw new HttpException(
      "Content moderation queue entry not found or already resolved",
      404,
    );
  }
  // Validate that the assigned administrator exists and is active
  const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: {
      id: props.body.assigned_admin_id,
      deleted_at: null, // Only assign to active administrators
    },
  });
  if (!admin) {
    throw new HttpException(
      "Assigned administrator not found or inactive",
      404,
    );
  }
  // Check if active assignment already exists for this queue
  const existingAssignment =
    await MyGlobal.prisma.discussion_board_content_moderation_queue_assignments.findFirst(
      {
        where: {
          discussion_board_content_moderation_queue_id:
            props.body.discussion_board_content_moderation_queue_id,
          completed_at: null, // Only check incomplete assignments
        },
      },
    );
  if (existingAssignment) {
    throw new HttpException(
      "Active assignment already exists for this moderation queue entry",
      409,
    );
  }
  // Create the assignment using collector
  const created =
    await MyGlobal.prisma.discussion_board_content_moderation_queue_assignments.create(
      {
        data: await DiscussionBoardContentModerationQueueAssignmentCollector.collect(
          {
            body: props.body,
          },
        ),
        ...DiscussionBoardContentModerationQueueAssignmentTransformer.select(),
      },
    );
  // Transform and return the result
  return await DiscussionBoardContentModerationQueueAssignmentTransformer.transform(
    created,
  );
}
