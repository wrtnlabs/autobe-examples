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
  const notificationId = v4() as string & tags.Format<"uuid">;
  const nowStr = toISOStringSafe(new Date());
  // Create the notification record
  const created = await MyGlobal.prisma.ecommerce_mall_notifications.create({
    data: {
      id: notificationId,
      title: props.body.title,
      body: props.body.body,
      type: props.body.type,
      status: "unread",
      created_at: nowStr,
      updated_at: nowStr,
      deleted_at: null,
    },
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
  // For each recipient, create junction record and actor-specific reference record
  await Promise.all(
    props.body.recipients.map(async (recipient) => {
      // Create junction record in notification_recipients
      await MyGlobal.prisma.ecommerce_mall_notification_recipients.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          notification_id: notificationId,
          recipient_type: recipient.recipient_type,
          recipient_id: recipient.recipient_id,
          read_status: "unread",
          created_at: nowStr,
          updated_at: nowStr,
        },
      });
      // Create actor-specific reference record based on recipient_type
      const actorReferenceTable = {
        customer: "ecommerce_mall_notification_of_customers",
        seller: "ecommerce_mall_notification_of_sellers",
        admin: "ecommerce_mall_notification_of_admins",
        superAdmin: "ecommerce_mall_notification_of_super_admins",
        guest: "ecommerce_mall_notification_of_guests",
      } as const;
      const tableName = actorReferenceTable[recipient.recipient_type];
      const prismaModel = MyGlobal.prisma[tableName] as any;
      await prismaModel.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          notification_id: notificationId,
          created_at: nowStr,
          updated_at: nowStr,
        },
      });
    }),
  );
  // Transform and return the created notification
  return await EcommerceMallNotificationTransformer.transform(created);
}
