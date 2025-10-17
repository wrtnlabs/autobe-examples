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

export async function putCommunityPlatformModeratorModerationQueuesModerationQueueId(props: {
  moderator: ModeratorPayload;
  moderationQueueId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationQueue.IUpdate;
}): Promise<ICommunityPlatformModerationQueue> {
  const { moderationQueueId, body } = props;

  // 1. Fetch existing queue entry, throw 404 if not found
  const queue =
    await MyGlobal.prisma.community_platform_moderation_queues.findUnique({
      where: { id: moderationQueueId },
    });

  if (queue === null) {
    throw new HttpException("Moderation queue entry not found", 404);
  }

  // 2. Block updates if status is already 'resolved'
  if (queue.status === "resolved") {
    throw new HttpException(
      "Cannot update a resolved moderation queue entry",
      400,
    );
  }

  // 3. Prepare update fields from body (only provided fields)
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.community_platform_moderation_queues.update({
    where: { id: moderationQueueId },
    data: {
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.priority !== undefined ? { priority: body.priority } : {}),
      ...(body.assigned_moderator_id !== undefined
        ? { assigned_moderator_id: body.assigned_moderator_id }
        : {}),
      updated_at: now,
    },
  });

  // 4. Re-fetch the updated record (to get full state)
  const updated =
    await MyGlobal.prisma.community_platform_moderation_queues.findUnique({
      where: { id: moderationQueueId },
    });
  if (updated === null) {
    throw new HttpException(
      "Moderation queue entry not found after update",
      404,
    );
  }

  // 5. Map DB fields to API DTO
  return {
    id: updated.id,
    community_id: updated.community_id,
    report_id: updated.report_id,
    assigned_moderator_id: updated.assigned_moderator_id ?? undefined,
    status: updated.status,
    priority: updated.priority,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
