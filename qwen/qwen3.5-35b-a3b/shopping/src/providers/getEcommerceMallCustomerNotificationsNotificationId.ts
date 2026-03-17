import { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallNotificationTransformer } from "../transformers/EcommerceMallNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerNotificationsNotificationId(props: {
  customer: CustomerPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallNotification> {
  const notification =
    await MyGlobal.prisma.ecommerce_mall_notifications.findUniqueOrThrow({
      where: {
        id: props.notificationId,
        deleted_at: null,
      },
      ...EcommerceMallNotificationTransformer.select(),
    });
  const hasAccess =
    await MyGlobal.prisma.ecommerce_mall_notification_of_customers.findFirst({
      where: {
        ecommerce_mall_notification_id: notification.id,
        ecommerce_mall_customer_id: props.customer.id,
      },
    });
  if (hasAccess === null) {
    const recipientCount =
      await MyGlobal.prisma.ecommerce_mall_notification_recipients.count({
        where: {
          notification_id: notification.id,
          recipient_type: "customer",
          recipient_id: props.customer.id,
        },
      });
    if (recipientCount === 0) {
      throw new HttpException("Notification not found", 404);
    }
  }
  return await EcommerceMallNotificationTransformer.transform(notification);
}
