import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdministratorUserNotificationsUserNotificationId(props: {
  administrator: AdministratorPayload;
  userNotificationId: string & tags.Format<"uuid">;
  body: IShoppingMallUserNotification.IUpdate;
}): Promise<IShoppingMallUserNotification> {
  const notification =
    await MyGlobal.prisma.shopping_mall_user_notifications.findUnique({
      where: { id: props.userNotificationId },
    });
  if (!notification) {
    throw new HttpException("Notification not found", 404);
  }
  const isOwner = notification.owner_id === props.administrator.id;
  if (!isOwner) {
    throw new HttpException("Forbidden", 403);
  }
  const updateData: Partial<Prisma.shopping_mall_user_notificationsUpdateInput> =
    {};
  if (
    "title" in props.body &&
    props.body.title !== undefined &&
    props.body.title !== null
  )
    updateData.title = props.body.title;
  if (
    "body" in props.body &&
    props.body.body !== undefined &&
    props.body.body !== null
  )
    updateData.body = props.body.body;
  if (
    "url" in props.body &&
    props.body.url !== undefined &&
    props.body.url !== null
  )
    updateData.url = props.body.url;
  if (
    "image_url" in props.body &&
    props.body.image_url !== undefined &&
    props.body.image_url !== null
  )
    updateData.image_url = props.body.image_url;
  else if (
    "imageUrl" in props.body &&
    props.body.imageUrl !== undefined &&
    props.body.imageUrl !== null
  )
    updateData.image_url = props.body.imageUrl;
  if (
    "is_read" in props.body &&
    props.body.is_read !== undefined &&
    props.body.is_read !== null
  )
    updateData.is_read = props.body.is_read;
  else if (
    "isRead" in props.body &&
    props.body.isRead !== undefined &&
    props.body.isRead !== null
  )
    updateData.is_read = props.body.isRead;
  if (
    "delivered_at" in props.body &&
    props.body.delivered_at !== undefined &&
    props.body.delivered_at !== null
  )
    updateData.delivered_at = toISOStringSafe(
      props.body.delivered_at as unknown as Date,
    );
  else if (
    "deliveredAt" in props.body &&
    props.body.deliveredAt !== undefined &&
    props.body.deliveredAt !== null
  )
    updateData.delivered_at = toISOStringSafe(
      props.body.deliveredAt as unknown as Date,
    );
  if (
    "read_at" in props.body &&
    props.body.read_at !== undefined &&
    props.body.read_at !== null
  )
    updateData.read_at = toISOStringSafe(props.body.read_at as unknown as Date);
  else if (
    "readAt" in props.body &&
    props.body.readAt !== undefined &&
    props.body.readAt !== null
  )
    updateData.read_at = toISOStringSafe(props.body.readAt as unknown as Date);
  await MyGlobal.prisma.shopping_mall_user_notifications.update({
    where: { id: props.userNotificationId },
    data: updateData,
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_user_notifications.findUnique({
      where: { id: props.userNotificationId },
    });
  if (!updated) {
    throw new HttpException("Notification not found", 404);
  }
  return updated;
}
