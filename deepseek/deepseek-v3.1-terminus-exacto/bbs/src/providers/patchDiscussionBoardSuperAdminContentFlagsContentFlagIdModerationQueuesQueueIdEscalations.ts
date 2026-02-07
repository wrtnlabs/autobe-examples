import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import { IDiscussionBoardContentModerationQueueEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueEscalation";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardContentModerationQueueEscalationTransformer } from "../transformers/DiscussionBoardContentModerationQueueEscalationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminContentFlagsContentFlagIdModerationQueuesQueueIdEscalations(props: {
  superAdmin: SuperadminPayload;
  contentFlagId: string & tags.Format<"uuid">;
  queueId: string & tags.Format<"uuid">;
  body: IDiscussionBoardContentModerationQueueEscalation.IUpdate;
}): Promise<IDiscussionBoardContentModerationQueueEscalation> {
  // Validate content flag exists
  const contentFlag =
    await MyGlobal.prisma.discussion_board_content_flags.findUnique({
      where: { id: props.contentFlagId },
    });
  if (!contentFlag) {
    throw new HttpException("Content flag not found", 404);
  }
  // Validate moderation queue exists and belongs to content flag
  const moderationQueue =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.findFirst({
      where: {
        id: props.queueId,
        content_flag_id: props.contentFlagId,
      },
    });
  if (!moderationQueue) {
    throw new HttpException("Moderation queue not found", 404);
  }
  // Find existing escalation
  const existingEscalation =
    await MyGlobal.prisma.discussion_board_content_moderation_queue_escalations.findFirst(
      {
        where: {
          discussion_board_content_moderation_queue_id: props.queueId,
        },
      },
    );
  if (!existingEscalation) {
    throw new HttpException("Escalation not found", 404);
  }
  // Validate assignments exist if provided
  if (props.body.assigned_to_admin_id) {
    const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
      where: { id: props.body.assigned_to_admin_id },
    });
    if (!admin) {
      throw new HttpException("Assigned admin not found", 400);
    }
  }
  if (props.body.assigned_to_super_admin_id) {
    const superAdmin =
      await MyGlobal.prisma.discussion_board_super_admins.findUnique({
        where: { id: props.body.assigned_to_super_admin_id },
      });
    if (!superAdmin) {
      throw new HttpException("Assigned super admin not found", 400);
    }
  }
  // Build update data with proper null handling
  const updateData: Prisma.discussion_board_content_moderation_queue_escalationsUpdateInput =
    {};
  // Handle scalar fields
  if (props.body.escalation_type !== undefined)
    updateData.escalation_type = props.body.escalation_type;
  if (props.body.previous_priority !== undefined)
    updateData.previous_priority = props.body.previous_priority;
  if (props.body.new_priority !== undefined)
    updateData.new_priority = props.body.new_priority;
  if (props.body.escalation_reason !== undefined)
    updateData.escalation_reason = props.body.escalation_reason;
  if (props.body.workflow_state_before !== undefined)
    updateData.workflow_state_before = props.body.workflow_state_before;
  if (props.body.workflow_state_after !== undefined)
    updateData.workflow_state_after = props.body.workflow_state_after;
  // Handle assignment relationships with proper null/undefined distinction
  if (props.body.assigned_to_admin_id !== undefined) {
    updateData.assignedToAdmin = props.body.assigned_to_admin_id
      ? { connect: { id: props.body.assigned_to_admin_id } }
      : undefined;
  }
  if (props.body.assigned_to_super_admin_id !== undefined) {
    updateData.assignedToSuperAdmin = props.body.assigned_to_super_admin_id
      ? { connect: { id: props.body.assigned_to_super_admin_id } }
      : undefined;
  }
  // Always update the timestamp
  updateData.updated_at = toISOStringSafe(new Date());
  // Update the escalation
  const updated =
    await MyGlobal.prisma.discussion_board_content_moderation_queue_escalations.update(
      {
        where: { id: existingEscalation.id },
        data: updateData,
        ...DiscussionBoardContentModerationQueueEscalationTransformer.select(),
      },
    );
  return await DiscussionBoardContentModerationQueueEscalationTransformer.transform(
    updated,
  );
}
