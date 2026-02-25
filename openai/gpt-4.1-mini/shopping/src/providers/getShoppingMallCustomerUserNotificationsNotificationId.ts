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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallUserNotificationTransformer } from "../transformers/ShoppingMallUserNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerUserNotificationsNotificationId(props: {
  customer: CustomerPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallUserNotification> {
  const notification =
    await MyGlobal.prisma.shopping_mall_user_notifications.findUniqueOrThrow({
      where: { id: props.notificationId },
      ...ShoppingMallUserNotificationTransformer.select(),
    });
  if (
    notification.owner_id !== props.customer.id ||
    notification.owner_type !== "customer"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (notification.deleted_at !== null) {
    throw new HttpException("Notification not found", 404);
  }
  return ShoppingMallUserNotificationTransformer.transform(notification);
}
