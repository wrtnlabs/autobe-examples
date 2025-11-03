import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsNotification";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function postCommunityBbsCommunityMemberNotificationsNotificationIdMarkRead(props: {
  communityMember: CommunitymemberPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<ICommunityBbsNotification> {
  const { communityMember, notificationId } = props;

  const notification =
    await MyGlobal.prisma.community_bbs_notifications.findUniqueOrThrow({
      where: { id: notificationId },
    });

  if (notification.recipient_id !== communityMember.id) {
    throw new HttpException("Forbidden", 403);
  }

  if (notification.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  const now = toISOStringSafe(new Date());

  const refreshed = await MyGlobal.prisma.$transaction(async (tx) => {
    if (notification.delivered_at === null) {
      const updateResult = await tx.community_bbs_notifications.updateMany({
        where: { id: notificationId, updated_at: notification.updated_at },
        data: {
          status: "recipient_acknowledged",
          delivered_at: now,
          updated_at: now,
        },
      });

      if (updateResult.count === 0) {
        throw new HttpException("Conflict: concurrent modification", 409);
      }

      await tx.community_bbs_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          actor_type: "community_member",
          actor_id: communityMember.id,
          entity: "notification",
          action: "acknowledged",
          payload: JSON.stringify({
            notificationId,
            previous_status: notification.status,
          }),
          ip: null,
          created_at: now,
          updated_at: now,
        },
      });
    } else {
      const updateResult = await tx.community_bbs_notifications.updateMany({
        where: { id: notificationId, updated_at: notification.updated_at },
        data: { updated_at: now },
      });

      if (updateResult.count === 0) {
        throw new HttpException("Conflict: concurrent modification", 409);
      }

      await tx.community_bbs_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          actor_type: "community_member",
          actor_id: communityMember.id,
          entity: "notification",
          action: "acknowledged",
          payload: JSON.stringify({ notificationId, note: "re-acknowledged" }),
          ip: null,
          created_at: now,
          updated_at: now,
        },
      });
    }

    return await tx.community_bbs_notifications.findUniqueOrThrow({
      where: { id: notificationId },
    });
  });

  return {
    id: refreshed.id as string & tags.Format<"uuid">,
    recipient_id: refreshed.recipient_id as string & tags.Format<"uuid">,
    actor_id:
      refreshed.actor_id === null
        ? null
        : (refreshed.actor_id as string & tags.Format<"uuid">),
    target_type: refreshed.target_type,
    target_id: refreshed.target_id as string & tags.Format<"uuid">,
    notification_key: refreshed.notification_key,
    notification_type: refreshed.notification_type,
    channel: refreshed.channel,
    priority: refreshed.priority,
    status: refreshed.status,
    attempts: (refreshed.attempts ?? 0) as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    last_attempt_at: refreshed.last_attempt_at
      ? toISOStringSafe(refreshed.last_attempt_at)
      : null,
    delivered_at: refreshed.delivered_at
      ? toISOStringSafe(refreshed.delivered_at)
      : null,
    scheduled_at: refreshed.scheduled_at
      ? toISOStringSafe(refreshed.scheduled_at)
      : null,
    body: refreshed.body ?? null,
    payload_uri: refreshed.payload_uri ?? null,
    delivery_result: refreshed.delivery_result ?? null,
    suppressed: refreshed.suppressed ?? false,
    created_at: toISOStringSafe(refreshed.created_at),
    updated_at: toISOStringSafe(refreshed.updated_at),
    deleted_at: refreshed.deleted_at
      ? toISOStringSafe(refreshed.deleted_at)
      : null,
  };
}
