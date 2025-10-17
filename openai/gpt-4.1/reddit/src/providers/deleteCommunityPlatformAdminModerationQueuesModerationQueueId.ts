import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminModerationQueuesModerationQueueId(props: {
  admin: AdminPayload;
  moderationQueueId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, moderationQueueId } = props;
  const queue =
    await MyGlobal.prisma.community_platform_moderation_queues.findUnique({
      where: { id: moderationQueueId },
    });
  if (queue === null) {
    throw new HttpException("Moderation queue entry not found", 404);
  }
  if (queue.status !== "resolved" && queue.status !== "closed") {
    throw new HttpException(
      "Only resolved or closed moderation queue entries can be deleted",
      400,
    );
  }
  await MyGlobal.prisma.community_platform_moderation_queues.delete({
    where: { id: moderationQueueId },
  });
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "admin",
      actor_id: admin.id,
      action_type: "delete",
      target_table: "community_platform_moderation_queues",
      target_id: moderationQueueId,
      details: JSON.stringify({
        message: "Deleted moderation queue entry",
        queueId: moderationQueueId,
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
