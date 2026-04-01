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
import { EcommerceMallNotificationTransformer } from "../transformers/EcommerceMallNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminNotificationsDeliver(props: {
  admin: AdminPayload;
  body: IEcommerceMallNotification.IDeliver;
}): Promise<IEcommerceMallNotification> {
  const now = new Date();
  const notification =
    await MyGlobal.prisma.ecommerce_mall_notifications.create({
      data: {
        id: v4(),
        title: props.body.title,
        body: props.body.body,
        type: props.body.type,
        status: "unread",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  for (const recipient of props.body.recipients) {
    await MyGlobal.prisma.ecommerce_mall_notification_recipients.create({
      data: {
        id: v4(),
        notification: { connect: { id: notification.id } },
        recipient_type: recipient.recipient_type,
        recipient_id: recipient.recipient_id,
        read_status: "unread",
        created_at: now,
        updated_at: now,
      },
    });
    switch (recipient.recipient_type) {
      case "customer":
        await MyGlobal.prisma.ecommerce_mall_notification_of_customers.create({
          data: {
            id: v4(),
            ecommerce_mall_notification_id: notification.id,
            ecommerce_mall_customer_id: recipient.recipient_id,
            created_at: now,
            updated_at: now,
          },
        });
        break;
      case "seller":
        await MyGlobal.prisma.ecommerce_mall_notification_of_sellers.create({
          data: {
            id: v4(),
            notification_id: notification.id,
            seller_id: recipient.recipient_id,
            created_at: now,
            updated_at: now,
          },
        });
        break;
      case "admin":
        await MyGlobal.prisma.ecommerce_mall_notification_of_admins.create({
          data: {
            id: v4(),
            notification_id: notification.id,
            admin_id: recipient.recipient_id,
            created_at: now,
            updated_at: now,
          },
        });
        break;
      case "superAdmin":
        await MyGlobal.prisma.ecommerce_mall_notification_of_super_admins.create(
          {
            data: {
              id: v4(),
              notification_id: notification.id,
              super_admin_id: recipient.recipient_id,
              created_at: now,
              updated_at: now,
            },
          },
        );
        break;
      case "guest":
        await MyGlobal.prisma.ecommerce_mall_notification_of_guests.create({
          data: {
            id: v4(),
            notification_id: notification.id,
            guest_id: recipient.recipient_id,
            created_at: now,
            updated_at: now,
          },
        });
        break;
    }
  }
  const found =
    await MyGlobal.prisma.ecommerce_mall_notifications.findUniqueOrThrow({
      where: { id: notification.id },
      ...EcommerceMallNotificationTransformer.select(),
    });
  return await EcommerceMallNotificationTransformer.transform(found);
}
