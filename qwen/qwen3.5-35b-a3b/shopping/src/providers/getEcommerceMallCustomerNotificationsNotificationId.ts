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
  // Query the notification ensuring it exists and is not soft-deleted
  const notification =
    await MyGlobal.prisma.ecommerce_mall_notifications.findUniqueOrThrow({
      where: {
        id: props.notificationId,
        deleted_at: null,
      },
      ...EcommerceMallNotificationTransformer.select(),
    });
  // Verify customer has access to this notification
  // Check if there's a reference in the customer notification reference table
  const customerReference =
    await MyGlobal.prisma.ecommerce_mall_notification_of_customers.findFirst({
      where: {
        notification: {
          id: props.notificationId,
        },
        customer: {
          id: props.customer.id,
        },
      },
    });
  // If no direct reference, check the recipients junction table
  if (!customerReference) {
    const recipient =
      await MyGlobal.prisma.ecommerce_mall_notification_recipients.findFirst({
        where: {
          notification: {
            id: props.notificationId,
          },
          recipient_id: props.customer.id,
          recipient_type: "customer",
        },
      });
    if (!recipient) {
      throw new HttpException("Notification not found", 404);
    }
  }
  return await EcommerceMallNotificationTransformer.transform(notification);
}
