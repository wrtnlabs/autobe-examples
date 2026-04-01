import { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminNotificationsNotificationId(props: {
  admin: AdminPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IEcommerceMallNotification.IUpdate;
}): Promise<IEcommerceMallNotification> {
  // Verify notification exists and is not soft-deleted
  const existingNotification =
    await MyGlobal.prisma.ecommerce_mall_notifications.findFirst({
      where: {
        id: props.notificationId,
        deleted_at: null,
      },
    });
  if (existingNotification === null) {
    throw new HttpException("Notification not found", 404);
  }
  // Build update data with only specified fields
  const updateData = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.body !== undefined && { body: props.body.body }),
    ...(props.body.type !== undefined && { type: props.body.type }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    updated_at: new Date(),
  };
  // Perform update (unique constraints on type/status enforced by database)
  const updated = await MyGlobal.prisma.ecommerce_mall_notifications.update({
    where: { id: props.notificationId },
    data: updateData,
    select: {
      id: true,
      title: true,
      body: true,
      type: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    id: updated.id,
    title: updated.title,
    body: updated.body,
    type: updated.type,
    status: updated.status,
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
    deleted_at: updated.deleted_at?.toISOString() ?? null,
  } satisfies IEcommerceMallNotification;
}
