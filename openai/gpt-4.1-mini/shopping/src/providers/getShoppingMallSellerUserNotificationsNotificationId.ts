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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallUserNotificationTransformer } from "../transformers/ShoppingMallUserNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerUserNotificationsNotificationId(props: {
  seller: SellerPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallUserNotification> {
  const notification =
    await MyGlobal.prisma.shopping_mall_user_notifications.findUnique({
      where: { id: props.notificationId },
      ...ShoppingMallUserNotificationTransformer.select(),
    });
  if (notification === null || notification.deleted_at !== null) {
    throw new HttpException("Notification not found", 404);
  }
  if (
    notification.owner_type !== "seller" ||
    notification.owner_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallUserNotificationTransformer.transform(notification);
}
