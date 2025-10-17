import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussNotification";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putEconDiscussMemberMeNotificationsNotificationId(props: {
  member: MemberPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IEconDiscussNotification.IUpdate;
}): Promise<IEconDiscussNotification> {
  const { member, notificationId, body } = props;

  const existing = await MyGlobal.prisma.econ_discuss_notifications.findFirst({
    where: {
      id: notificationId,
      deleted_at: null,
    },
    select: {
      id: true,
      recipient_user_id: true,
    },
  });

  if (existing === null) {
    throw new HttpException("Not Found", 404);
  }
  if (existing.recipient_user_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own notifications",
      403,
    );
  }

  const nowIso = toISOStringSafe(new Date());
  const nextReadAt = body.isRead ? nowIso : null;

  const updated = await MyGlobal.prisma.econ_discuss_notifications.update({
    where: { id: notificationId },
    data: {
      read_at: nextReadAt,
      updated_at: nowIso,
    },
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      actor_user_id: true,
      entity_type: true,
      entity_id: true,
      created_at: true,
      updated_at: true,
      read_at: true,
    },
  });

  return {
    id: notificationId,
    type: updated.type,
    title: updated.title,
    body: updated.body ?? null,
    actorUserId: updated.actor_user_id === null ? null : undefined,
    entityType: updated.entity_type ?? null,
    entityId: updated.entity_id === null ? null : undefined,
    isRead: body.isRead,
    readAt: nextReadAt,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: nowIso,
  };
}
