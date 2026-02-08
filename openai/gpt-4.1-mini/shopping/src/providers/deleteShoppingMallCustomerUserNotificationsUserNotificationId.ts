import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallCustomerUserNotificationsUserNotificationId(props: {
  customer: CustomerPayload;
  userNotificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const notification =
    await MyGlobal.prisma.shopping_mall_user_notifications.findUnique({
      where: { id: props.userNotificationId },
    });
  if (notification === null) {
    throw new HttpException("Notification not found", 404);
  }
  if (notification.owner_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_user_notifications.delete({
    where: { id: props.userNotificationId },
  });
}
