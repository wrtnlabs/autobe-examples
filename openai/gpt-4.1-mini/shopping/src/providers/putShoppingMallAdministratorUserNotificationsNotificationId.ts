import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallUserNotificationTransformer } from "../transformers/ShoppingMallUserNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdministratorUserNotificationsNotificationId(props: {
  administrator: AdministratorPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IShoppingMallUserNotification.IUpdate;
}): Promise<IShoppingMallUserNotification> {
  // Ensure the notification exists
  await MyGlobal.prisma.shopping_mall_user_notifications.findUniqueOrThrow({
    where: { id: props.notificationId },
  });
  // Update the notification with mutable properties
  await MyGlobal.prisma.shopping_mall_user_notifications.update({
    where: { id: props.notificationId },
    data: {
      title: props.body.title,
      body: props.body.body,
      url: props.body.url ?? null,
      image_url: props.body.imageUrl ?? null,
      is_read: props.body.isRead,
      delivered_at: props.body.deliveredAt ?? null,
      read_at: props.body.readAt ?? null,
      updated_at: props.body.updatedAt,
    },
  });
  // Retrieve updated record with transformer select
  const updated =
    await MyGlobal.prisma.shopping_mall_user_notifications.findUniqueOrThrow({
      where: { id: props.notificationId },
      ...ShoppingMallUserNotificationTransformer.select(),
    });
  // Transform into API response DTO
  return ShoppingMallUserNotificationTransformer.transform(updated);
}
