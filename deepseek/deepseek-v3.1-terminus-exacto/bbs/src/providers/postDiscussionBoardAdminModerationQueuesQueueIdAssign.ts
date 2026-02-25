import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardContentModerationQueueAssignmentTransformer } from "../transformers/DiscussionBoardContentModerationQueueAssignmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminModerationQueuesQueueIdAssign(props: {
  admin: AdminPayload;
  queueId: string & tags.Format<"uuid">;
  body: IDiscussionBoardContentModerationQueueAssignment.IAdministratorAssignment;
}): Promise<IDiscussionBoardContentModerationQueueAssignment> {
  const queue =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.findUniqueOrThrow(
      {
        where: { id: props.queueId },
      },
    );
  if (
    queue.moderation_status === "resolved" ||
    queue.moderation_status === "dismissed"
  ) {
    throw new HttpException("Cannot assign resolved or dismissed queue", 400);
  }
  if (props.body.assigned_admin_id !== null) {
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: { id: props.body.assigned_admin_id, deleted_at: null },
    });
  }
  const isAssignmentChange =
    queue.assigned_admin_id !== props.body.assigned_admin_id;
  const now = new Date();
  const updatedQueue =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.update({
      where: { id: props.queueId },
      data: {
        assigned_admin_id: props.body.assigned_admin_id,
        assigned_at: props.body.assigned_admin_id !== null ? now : null,
        moderation_status:
          queue.moderation_status === "pending" &&
          props.body.assigned_admin_id !== null
            ? "under_review"
            : queue.moderation_status,
        assignment_history_count: isAssignmentChange
          ? { increment: 1 }
          : queue.assignment_history_count,
        updated_at: now,
      },
      ...DiscussionBoardContentModerationQueueAssignmentTransformer.select(),
    });
  return await DiscussionBoardContentModerationQueueAssignmentTransformer.transform(
    updatedQueue,
  );
}
