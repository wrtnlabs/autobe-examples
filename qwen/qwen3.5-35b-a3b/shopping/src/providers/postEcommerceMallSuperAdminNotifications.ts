import { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallNotificationTransformer } from "../transformers/EcommerceMallNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSuperAdminNotifications(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallNotification.ICreate;
}): Promise<IEcommerceMallNotification> {
  // Validate that at least one recipient is provided
  if (props.body.recipients.length < 1) {
    throw new HttpException("At least one recipient is required", 400);
  }
  // Collect all unique recipients to validate
  const uniqueRecipients: Map<
    string,
    {
      recipientType: string;
      recipientId: string & tags.Format<"uuid">;
    }
  > = new Map();
  for (const deliver of props.body.recipients) {
    for (const recipient of deliver.recipients) {
      const key = `${recipient.recipient_type}:${recipient.recipient_id}`;
      if (!uniqueRecipients.has(key)) {
        uniqueRecipients.set(key, {
          recipientType: recipient.recipient_type,
          recipientId: recipient.recipient_id,
        });
      }
    }
  }
  // Validate each recipient exists and matches actor type
  for (const { recipientType, recipientId } of uniqueRecipients.values()) {
    switch (recipientType) {
      case "customer": {
        const customer =
          await MyGlobal.prisma.ecommerce_mall_customers.findUnique({
            where: { id: recipientId, deleted_at: null },
          });
        if (customer === null) {
          throw new HttpException("Customer not found", 404);
        }
        break;
      }
      case "seller": {
        const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
          where: { id: recipientId, deleted_at: null },
        });
        if (seller === null) {
          throw new HttpException("Seller not found", 404);
        }
        break;
      }
      case "admin": {
        const admin = await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
          where: { id: recipientId, deleted_at: null },
        });
        if (admin === null) {
          throw new HttpException("Administrator not found", 404);
        }
        break;
      }
      case "superAdmin": {
        const superAdminCheck =
          await MyGlobal.prisma.ecommerce_mall_super_admins.findUnique({
            where: { id: recipientId, deleted_at: null },
          });
        if (superAdminCheck === null) {
          throw new HttpException("Super administrator not found", 404);
        }
        break;
      }
      case "guest": {
        const guest = await MyGlobal.prisma.ecommerce_mall_guests.findUnique({
          where: { id: recipientId, deleted_at: null },
        });
        if (guest === null) {
          throw new HttpException("Guest not found", 404);
        }
        break;
      }
      default: {
        throw new HttpException("Invalid recipient type", 400);
      }
    }
  }
  // Create notification with all recipient references within a transaction
  const created: Prisma.ecommerce_mall_notificationsGetPayload<{
    select: {
      id: true;
      title: true;
      body: true;
      type: true;
      status: true;
      created_at: true;
      updated_at: true;
      deleted_at: true;
    };
  }> = await MyGlobal.prisma.$transaction(async (tx) => {
    const id: string = v4();
    const now: Date = new Date();
    // Create flat recipients array from nested structure
    const flatRecipients: Prisma.ecommerce_mall_notification_recipientsUncheckedCreateInput[] =
      props.body.recipients.flatMap(
        (deliver: IEcommerceMallNotification.IDeliver) =>
          deliver.recipients.map(
            (recipient: IEcommerceMallNotification.IDeliverRecipient) => ({
              id: v4(),
              notification_id: id,
              recipient_type: recipient.recipient_type,
              recipient_id: recipient.recipient_id,
              read_status: "unread",
              read_at: null,
              notified_at: null,
              created_at: now,
              updated_at: now,
            }),
          ),
      );
    // Create actor reference records
    for (const { recipientType, recipientId } of uniqueRecipients.values()) {
      switch (recipientType) {
        case "customer": {
          await tx.ecommerce_mall_notification_of_customers.create({
            data: {
              id: v4(),
              notification: { connect: { id } },
              customer: { connect: { id: recipientId } },
              created_at: now,
              updated_at: now,
            },
          });
          break;
        }
        case "seller": {
          await tx.ecommerce_mall_notification_of_sellers.create({
            data: {
              id: v4(),
              notification: { connect: { id } },
              seller: { connect: { id: recipientId } },
              created_at: now,
              updated_at: now,
            },
          });
          break;
        }
        case "admin": {
          await tx.ecommerce_mall_notification_of_admins.create({
            data: {
              id: v4(),
              notification: { connect: { id } },
              admin: { connect: { id: recipientId } },
              created_at: now,
              updated_at: now,
            },
          });
          break;
        }
        case "superAdmin": {
          await tx.ecommerce_mall_notification_of_super_admins.create({
            data: {
              id: v4(),
              notification: { connect: { id } },
              superAdmin: { connect: { id: recipientId } },
              created_at: now,
              updated_at: now,
            },
          });
          break;
        }
        case "guest": {
          await tx.ecommerce_mall_notification_of_guests.create({
            data: {
              id: v4(),
              notification: { connect: { id } },
              guest: { connect: { id: recipientId } },
              created_at: now,
              updated_at: now,
            },
          });
          break;
        }
      }
    }
    // Create main notification record
    return await tx.ecommerce_mall_notifications.create({
      data: {
        id,
        title: props.body.title,
        body: props.body.body,
        type: props.body.type,
        status: "unread",
        created_at: now,
        updated_at: now,
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
  });
  // Transform and return the created notification
  return await EcommerceMallNotificationTransformer.transform(created);
}
