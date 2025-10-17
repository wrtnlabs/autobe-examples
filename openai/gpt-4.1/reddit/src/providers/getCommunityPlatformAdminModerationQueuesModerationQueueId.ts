import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminModerationQueuesModerationQueueId(props: {
  admin: AdminPayload;
  moderationQueueId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationQueue> {
  const moderationQueue =
    await MyGlobal.prisma.community_platform_moderation_queues.findUnique({
      where: { id: props.moderationQueueId },
    });
  if (!moderationQueue) {
    throw new HttpException("Moderation queue entry not found", 404);
  }
  return {
    id: moderationQueue.id,
    community_id: moderationQueue.community_id,
    report_id: moderationQueue.report_id,
    assigned_moderator_id:
      moderationQueue.assigned_moderator_id === null
        ? undefined
        : moderationQueue.assigned_moderator_id,
    status: moderationQueue.status,
    priority: moderationQueue.priority,
    created_at: toISOStringSafe(moderationQueue.created_at),
    updated_at: toISOStringSafe(moderationQueue.updated_at),
  };
}
