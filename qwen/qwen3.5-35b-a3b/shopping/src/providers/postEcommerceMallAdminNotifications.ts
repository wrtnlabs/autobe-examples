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

export async function postEcommerceMallAdminNotifications(props: {
  admin: AdminPayload;
  body: IEcommerceMallNotification.ICreate;
}): Promise<IEcommerceMallNotification> {
  const notificationId = v4();
  const now = new Date();
  // Validate all recipients exist by actor type
  for (const recipient of props.body.recipients) {
    const actorType = (recipient as any).recipient_type;
    const actorId = (recipient as any).recipient_id;
    let actorExists = false;
    switch (actorType) {
      case "customer": {
        const customer =
          await MyGlobal.prisma.ecommerce_mall_customers.findUnique({
            where: { id: actorId, deleted_at: null },
          });
        actorExists = customer !== null;
        break;
      }
      case "seller": {
        const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
          where: { id: actorId, deleted_at: null },
        });
        actorExists = seller !== null;
        break;
      }
      case "admin": {
        const admin = await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
          where: { id: actorId, deleted_at: null },
        });
        actorExists = admin !== null;
        break;
      }
      case "superAdmin": {
        const superAdmin =
          await MyGlobal.prisma.ecommerce_mall_super_admins.findUnique({
            where: { id: actorId, deleted_at: null },
          });
        actorExists = superAdmin !== null;
        break;
      }
      case "guest": {
        const guest = await MyGlobal.prisma.ecommerce_mall_guests.findUnique({
          where: { id: actorId, deleted_at: null },
        });
        actorExists = guest !== null;
        break;
      }
      default: {
        throw new HttpException(`Invalid recipient type: ${actorType}`, 400);
      }
    }
    if (!actorExists) {
      throw new HttpException(
        `Actor ${actorType} with ID ${actorId} not found`,
        404,
      );
    }
  }
  // Create notification and all recipient references atomically
  const created = await MyGlobal.prisma.ecommerce_mall_notifications.create({
    data: {
      id: notificationId,
      title: props.body.title,
      body: props.body.body,
      type: props.body.type,
      status: "unread",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      recipients: {
        create: props.body.recipients.map((recipient) => ({
          id: v4(),
          notification_id: notificationId,
          recipient_type: (recipient as any).recipient_type,
          recipient_id: (recipient as any).recipient_id,
          read_status: "unread",
          created_at: now,
          updated_at: now,
        })),
      },
    },
    ...EcommerceMallNotificationTransformer.select(),
  });
  return await EcommerceMallNotificationTransformer.transform(created);
}
