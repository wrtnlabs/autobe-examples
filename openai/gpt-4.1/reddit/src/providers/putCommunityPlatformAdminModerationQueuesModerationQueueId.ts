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

export async function putCommunityPlatformAdminModerationQueuesModerationQueueId(props: {
  admin: AdminPayload;
  moderationQueueId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationQueue.IUpdate;
}): Promise<ICommunityPlatformModerationQueue> {
  // 1. Find queue entry (throw 404 if not found)
  const queue =
    await MyGlobal.prisma.community_platform_moderation_queues.findUnique({
      where: { id: props.moderationQueueId },
    });
  if (!queue) {
    throw new HttpException("Moderation queue entry not found", 404);
  }
  // 2. Prevent updates on resolved queues
  if (queue.status === "resolved") {
    throw new HttpException(
      "Cannot update already resolved moderation queue entry",
      409,
    );
  }
  // 3. If assigned_moderator_id is present, verify existence
  if (
    props.body.assigned_moderator_id !== undefined &&
    props.body.assigned_moderator_id !== null
  ) {
    const moderator =
      await MyGlobal.prisma.community_platform_moderators.findFirst({
        where: {
          id: props.body.assigned_moderator_id,
          deleted_at: null,
          status: "active",
        },
      });
    if (!moderator) {
      throw new HttpException(
        "Assigned moderator does not exist or inactive",
        400,
      );
    }
  }
  // 4. Prevent illegal status transitions (can't revert from resolved, etc.)
  if (
    props.body.status !== undefined &&
    props.body.status !== null &&
    queue.status === "resolved" &&
    props.body.status !== "resolved"
  ) {
    throw new HttpException(
      "Cannot change status from resolved to another state",
      409,
    );
  }
  // 5. Apply update with allowed fields
  const nowString = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.community_platform_moderation_queues.update({
      where: { id: props.moderationQueueId },
      data: {
        status: props.body.status ?? undefined,
        assigned_moderator_id: props.body.assigned_moderator_id ?? undefined,
        priority: props.body.priority ?? undefined,
        updated_at:
          props.body.updated_at !== undefined && props.body.updated_at !== null
            ? props.body.updated_at
            : nowString,
      },
    });
  // 6. Return result as API type, branding date fields and handling null/undefined
  return {
    id: updated.id,
    community_id: updated.community_id,
    report_id: updated.report_id,
    assigned_moderator_id:
      updated.assigned_moderator_id === null
        ? null
        : updated.assigned_moderator_id,
    status: updated.status,
    priority: updated.priority,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
