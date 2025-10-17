import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityPlatformModeratorModerationQueuesModerationQueueId(props: {
  moderator: ModeratorPayload;
  moderationQueueId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Locate moderation queue by id
  const queue =
    await MyGlobal.prisma.community_platform_moderation_queues.findUnique({
      where: { id: props.moderationQueueId },
    });
  if (!queue) {
    throw new HttpException("Moderation queue not found", 404);
  }
  // 2. Only allow deletion if queue.status is 'resolved' or 'closed'
  if (queue.status !== "resolved" && queue.status !== "closed") {
    throw new HttpException(
      "Only resolved or closed moderation queues can be deleted",
      403,
    );
  }
  // 3. Allow only moderators assigned to that community to delete; admins can delete all (not in schema, so only check for community moderation assignment)
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.findFirst(
      {
        where: {
          community_id: queue.community_id,
          member_id: props.moderator.id,
          end_at: null,
        },
      },
    );
  if (!moderatorAssignment) {
    throw new HttpException(
      "You do not have permission to delete this moderation queue",
      403,
    );
  }
  // 4. Perform deletion
  await MyGlobal.prisma.community_platform_moderation_queues.delete({
    where: { id: props.moderationQueueId },
  });
  // 5. Write audit log
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "moderator",
      actor_id: props.moderator.id,
      action_type: "delete",
      target_table: "community_platform_moderation_queues",
      target_id: props.moderationQueueId,
      details: null,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
