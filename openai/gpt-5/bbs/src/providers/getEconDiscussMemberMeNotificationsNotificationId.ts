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

export async function getEconDiscussMemberMeNotificationsNotificationId(props: {
  member: MemberPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IEconDiscussNotification> {
  const { member, notificationId } = props;

  const record = await MyGlobal.prisma.econ_discuss_notifications.findUnique({
    where: { id: notificationId },
  });

  if (!record) {
    throw new HttpException("Not Found", 404);
  }

  if (record.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  if (record.recipient_user_id !== member.id) {
    throw new HttpException("Forbidden", 403);
  }

  const readAt = record.read_at ? toISOStringSafe(record.read_at) : null;

  return {
    id: record.id as string & tags.Format<"uuid">,
    type: record.type,
    title: record.title,
    body: record.body ?? null,
    actorUserId: (record.actor_user_id ?? null) as
      | (string & tags.Format<"uuid">)
      | null,
    entityType: record.entity_type ?? null,
    entityId: (record.entity_id ?? null) as
      | (string & tags.Format<"uuid">)
      | null,
    isRead: record.read_at !== null,
    readAt,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: toISOStringSafe(record.updated_at),
  };
}
