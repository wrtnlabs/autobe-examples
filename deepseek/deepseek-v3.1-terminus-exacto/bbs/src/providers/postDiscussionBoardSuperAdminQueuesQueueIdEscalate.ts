import { IDiscussionBoardContentModerationQueueEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueEscalation";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardContentModerationQueueEscalationCollector } from "../collectors/DiscussionBoardContentModerationQueueEscalationCollector";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postDiscussionBoardSuperAdminQueuesQueueIdEscalate(props: {
  superAdmin: SuperAdminPayload;
  queueId: string & tags.Format<"uuid">;
  body: IDiscussionBoardContentModerationQueueEscalation.ICreate;
}): Promise<IDiscussionBoardContentModerationQueueEscalation> {
  // Validate queue exists and is modifiable
  const queue =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.findUniqueOrThrow(
      {
        where: { id: props.queueId },
        select: { moderation_status: true, priority_level: true },
      },
    );
  if (["resolved", "dismissed"].includes(queue.moderation_status)) {
    throw new HttpException(
      "Cannot escalate a resolved or dismissed queue entry",
      400,
    );
  }
  // Validate reassignment requirements
  if (
    props.body.escalation_type === "reassignment" &&
    !props.body.assigned_to_admin_id &&
    !props.body.assigned_to_super_admin_id
  ) {
    throw new HttpException(
      "Reassignment escalation requires assignment to admin or super admin",
      400,
    );
  }
  // Update queue entry with new priority and status
  const updatedQueue =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.update({
      where: { id: props.queueId },
      data: {
        priority_level: props.body.new_priority,
        moderation_status: "escalated",
        assigned_admin_id: props.body.assigned_to_admin_id || null,
        escalated_by_admin_id: null, // Super admin is escalating, not regular admin
        updated_at: new Date(),
        assigned_at: new Date(),
      },
      select: { id: true },
    });
  // Create escalation audit record
  const escalation =
    await MyGlobal.prisma.discussion_board_content_moderation_queue_escalations.create(
      {
        data: await DiscussionBoardContentModerationQueueEscalationCollector.collect(
          {
            body: props.body,
            discussionBoardContentModerationQueues: updatedQueue,
            discussionBoardAdmins: { id: props.superAdmin.id } as any,
            discussionBoardSuperAdmins: { id: props.superAdmin.id } as any,
          },
        ),
      },
    );
  // Compute escalation statistics
  const [totalEscalations, reasonCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_content_moderation_queue_escalations.count(
      {
        where: {
          escalation_reason: { not: "" },
        } satisfies Prisma.discussion_board_content_moderation_queue_escalationsWhereInput,
      },
    ),
    MyGlobal.prisma.discussion_board_content_moderation_queue_escalations.count(
      {
        where: {
          escalation_reason: props.body.escalation_reason,
        } satisfies Prisma.discussion_board_content_moderation_queue_escalationsWhereInput,
      },
    ),
  ]);
  const percentage =
    totalEscalations > 0 ? (reasonCount * 100) / totalEscalations : 0;
  return {
    reason: props.body.escalation_reason,
    count: reasonCount satisfies number as number & tags.Type<"int32">,
    percentage: Math.round(percentage * 100) / 100,
  };
}
