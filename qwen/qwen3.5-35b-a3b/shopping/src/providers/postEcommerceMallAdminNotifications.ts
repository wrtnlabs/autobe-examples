import { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallNotificationCollector } from "../collectors/EcommerceMallNotificationCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallNotificationTransformer } from "../transformers/EcommerceMallNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminNotifications(props: {
  admin: AdminPayload;
  body: IEcommerceMallNotification.ICreate;
}): Promise<IEcommerceMallNotification> {
  const result = await MyGlobal.prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const id: string & tags.Format<"uuid"> = v4();
      const notificationCreateData =
        await EcommerceMallNotificationCollector.collect({
          body: props.body,
        });
      const created = await tx.ecommerce_mall_notifications.create({
        data: {
          ...notificationCreateData,
          recipients: {
            create: props.body.recipients.map((recipient: any) => ({
              id: v4() as string & tags.Format<"uuid">,
              recipient_type: recipient.recipient_type,
              recipient_id: recipient.recipient_id,
              read_status: "unread",
              created_at: toISOStringSafe(new Date()),
              updated_at: toISOStringSafe(new Date()),
            })),
          },
        },
        ...EcommerceMallNotificationTransformer.select(),
      });
      const recipients =
        await tx.ecommerce_mall_notification_recipients.findMany({
          where: { notification_id: created.id },
        });
      for (const recipient of recipients) {
        let actor: {
          id: string;
        } | null = null;
        switch (recipient.recipient_type) {
          case "customer":
            actor = await tx.ecommerce_mall_customers.findFirst({
              where: { id: recipient.recipient_id, deleted_at: null },
              select: { id: true },
            });
            break;
          case "seller":
            actor = await tx.ecommerce_mall_sellers.findFirst({
              where: { id: recipient.recipient_id, deleted_at: null },
              select: { id: true },
            });
            break;
          case "admin":
            actor = await tx.ecommerce_mall_admins.findFirst({
              where: { id: recipient.recipient_id, deleted_at: null },
              select: { id: true },
            });
            break;
          case "superAdmin":
            actor = await tx.ecommerce_mall_super_admins.findFirst({
              where: { id: recipient.recipient_id, deleted_at: null },
              select: { id: true },
            });
            break;
          case "guest":
            actor = await tx.ecommerce_mall_guests.findFirst({
              where: { id: recipient.recipient_id, deleted_at: null },
              select: { id: true },
            });
            break;
        }
        if (actor === null) {
          throw new HttpException("Actor not found", 404);
        }
        switch (recipient.recipient_type) {
          case "customer":
            await tx.ecommerce_mall_notification_of_customers.create({
              data: {
                id: v4() as string & tags.Format<"uuid">,
                notification: { connect: { id: created.id } },
                customer: { connect: { id: actor.id } },
                created_at: toISOStringSafe(new Date()),
                updated_at: toISOStringSafe(new Date()),
              },
            });
            break;
          case "seller":
            await tx.ecommerce_mall_notification_of_sellers.create({
              data: {
                id: v4() as string & tags.Format<"uuid">,
                notification: { connect: { id: created.id } },
                seller: { connect: { id: actor.id } },
                created_at: toISOStringSafe(new Date()),
                updated_at: toISOStringSafe(new Date()),
              },
            });
            break;
          case "admin":
            await tx.ecommerce_mall_notification_of_admins.create({
              data: {
                id: v4() as string & tags.Format<"uuid">,
                notification: { connect: { id: created.id } },
                admin: { connect: { id: actor.id } },
                created_at: toISOStringSafe(new Date()),
                updated_at: toISOStringSafe(new Date()),
              },
            });
            break;
          case "superAdmin":
            await tx.ecommerce_mall_notification_of_super_admins.create({
              data: {
                id: v4() as string & tags.Format<"uuid">,
                notification: { connect: { id: created.id } },
                superAdmin: { connect: { id: actor.id } },
                created_at: toISOStringSafe(new Date()),
                updated_at: toISOStringSafe(new Date()),
              },
            });
            break;
          case "guest":
            await tx.ecommerce_mall_notification_of_guests.create({
              data: {
                id: v4() as string & tags.Format<"uuid">,
                notification: { connect: { id: created.id } },
                guest: { connect: { id: actor.id } },
                created_at: toISOStringSafe(new Date()),
                updated_at: toISOStringSafe(new Date()),
              },
            });
            break;
        }
      }
      return created;
    },
  );
  return EcommerceMallNotificationTransformer.transform(result);
}
