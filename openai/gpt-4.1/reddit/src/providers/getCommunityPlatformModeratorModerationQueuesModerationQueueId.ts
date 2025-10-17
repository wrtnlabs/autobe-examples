import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getCommunityPlatformModeratorModerationQueuesModerationQueueId(props: {
  moderator: ModeratorPayload;
  moderationQueueId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationQueue> {
  // Step 1: Get queue
  const queue =
    await MyGlobal.prisma.community_platform_moderation_queues.findUnique({
      where: { id: props.moderationQueueId },
    });
  if (!queue) throw new HttpException("Moderation queue entry not found", 404);

  // Step 2: Authorization - ensure moderator is assigned to this community (active, non-deleted)
  const isModerator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: queue.community_id,
        status: "active",
        deleted_at: null,
      },
    });
  if (!isModerator)
    throw new HttpException(
      "Forbidden: Not a moderator of this community",
      403,
    );

  // Step 3: Return DTO, convert date fields, assign nullable for assigned_moderator_id
  return {
    id: queue.id,
    community_id: queue.community_id,
    report_id: queue.report_id,
    assigned_moderator_id:
      queue.assigned_moderator_id === null ? null : queue.assigned_moderator_id,
    status: queue.status,
    priority: queue.priority,
    created_at: toISOStringSafe(queue.created_at),
    updated_at: toISOStringSafe(queue.updated_at),
  };
}
