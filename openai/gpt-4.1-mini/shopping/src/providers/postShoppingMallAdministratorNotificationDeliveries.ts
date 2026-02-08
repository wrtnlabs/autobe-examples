import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationDelivery";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallNotificationDeliveryCollector } from "../collectors/ShoppingMallNotificationDeliveryCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorNotificationDeliveries(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallNotificationDelivery.ICreate;
}): Promise<IShoppingMallNotificationDelivery> {
  // Because IShoppingMallNotificationDelivery.ICreate is empty type, access properties via unknown and type assert
  const body: any = props.body;
  // Extract values safely with runtime check
  const channel = body.channel as string | undefined;
  const status = body.status as string | undefined;
  const userNotificationId = body.shopping_mall_user_notification_id as
    | string
    | undefined;
  const notificationTemplateId = body.shopping_mall_notification_template_id as
    | string
    | undefined;
  const attemptedAt = body.attempted_at as string | undefined;
  const deliveredAt = body.delivered_at as string | null | undefined;
  // Validate all required fields
  if (
    typeof channel !== "string" ||
    typeof status !== "string" ||
    typeof userNotificationId !== "string" ||
    typeof notificationTemplateId !== "string" ||
    typeof attemptedAt !== "string"
  ) {
    throw new HttpException("Missing or invalid required delivery fields", 400);
  }
  // Validate status enum
  const allowedStatuses = ["delivered", "failed", "pending"] as const;
  if (!allowedStatuses.includes(status as any)) {
    throw new HttpException(`Invalid status: ${status}`, 400);
  }
  // Validate existence of referenced user notification
  const userNotification =
    await MyGlobal.prisma.shopping_mall_user_notifications.findUnique({
      where: { id: userNotificationId },
      select: { id: true },
    });
  if (!userNotification) {
    throw new HttpException("User notification not found", 404);
  }
  // Validate existence of referenced notification template
  const notificationTemplate =
    await MyGlobal.prisma.shopping_mall_notification_templates.findUnique({
      where: { id: notificationTemplateId },
      select: { id: true },
    });
  if (!notificationTemplate) {
    throw new HttpException("Notification template not found", 404);
  }
  // Use collector to prepare data
  const data = await ShoppingMallNotificationDeliveryCollector.collect({
    body: {
      channel,
      status,
      attemptedAt: new Date(attemptedAt),
      deliveredAt: deliveredAt ? new Date(deliveredAt) : null,
    },
    userNotification: { id: userNotificationId },
    notificationTemplate: { id: notificationTemplateId },
  });
  // Perform create operation in transaction
  const createdRecord = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.shopping_mall_notification_deliveries.create({ data });
  });
  // Format return object converting dates to ISO string or null
  return {
    id: createdRecord.id,
    shopping_mall_user_notification_id:
      createdRecord.shopping_mall_user_notification_id,
    shopping_mall_notification_template_id:
      createdRecord.shopping_mall_notification_template_id,
    channel: createdRecord.channel,
    status: createdRecord.status,
    attempted_at: createdRecord.attempted_at
      ? toISOStringSafe(createdRecord.attempted_at)
      : null,
    delivered_at: createdRecord.delivered_at
      ? toISOStringSafe(createdRecord.delivered_at)
      : null,
    created_at: toISOStringSafe(createdRecord.created_at),
    updated_at: toISOStringSafe(createdRecord.updated_at),
    deleted_at: createdRecord.deleted_at
      ? toISOStringSafe(createdRecord.deleted_at)
      : null,
  };
}
