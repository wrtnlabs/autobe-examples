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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardContentModerationQueueAssignmentTransformer } from "../transformers/DiscussionBoardContentModerationQueueAssignmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminModerationQueuesAssignments(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardContentModerationQueueAssignment.ICreate;
}): Promise<IDiscussionBoardContentModerationQueueAssignment> {
  // Validate that the moderation queue entry exists and is in a valid state
  const queueEntry =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.findUnique(
      {
        where: { id: props.body.discussion_board_content_moderation_queue_id },
      },
    );
  if (!queueEntry) {
    throw new HttpException("Content moderation queue entry not found", 404);
  }
  // Validate that the administrator exists and is active
  const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: {
      id: props.body.assigned_admin_id,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Administrator not found or inactive", 404);
  }
  // Check for existing active assignment to prevent duplicates
  const existingAssignment =
    await MyGlobal.prisma.discussion_board_content_moderation_queue_assignments.findFirst(
      {
        where: {
          discussion_board_content_moderation_queue_id:
            props.body.discussion_board_content_moderation_queue_id,
          completed_at: null,
        },
      },
    );
  if (existingAssignment) {
    throw new HttpException(
      "An active assignment already exists for this queue entry",
      409,
    );
  }
  // Create the assignment using the collector
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
  // Transform and return the response
  return await DiscussionBoardContentModerationQueueAssignmentTransformer.transform(
    created,
  );
}
