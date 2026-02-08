import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallUserNotificationCollector } from "../collectors/ShoppingMallUserNotificationCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerUserNotifications(props: {
  customer: CustomerPayload;
  body: IShoppingMallUserNotification.ICreate;
}): Promise<IShoppingMallUserNotification> {
  const { customer, body } = props;
  const validOwnerTypes = ["customer", "seller", "administrator"] as const;
  const input: any = body;
  if (!validOwnerTypes.includes(input.owner_type)) {
    throw new HttpException("Invalid owner_type", 400);
  }
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(input.notification_template_id)) {
    throw new HttpException("Invalid notification_template_id format", 400);
  }
  if (!uuidRegex.test(input.owner_id)) {
    throw new HttpException("Invalid owner_id format", 400);
  }
  const notificationTemplate =
    await MyGlobal.prisma.shopping_mall_notification_templates.findUnique({
      where: { id: input.notification_template_id },
    });
  if (!notificationTemplate) {
    throw new HttpException("Notification template not found", 404);
  }
  const owner = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: input.owner_id },
  });
  if (!owner) {
    throw new HttpException("Owner not found", 404);
  }
  const now = toISOStringSafe(new Date());
  const data = await ShoppingMallUserNotificationCollector.collect({
    body: {
      notification_template_id: input.notification_template_id,
      owner_id: input.owner_id,
      owner_type: input.owner_type,
      title: input.title ?? null,
      body: input.body ?? null,
      url: input.url ?? null,
      image_url: input.image_url ?? null,
      is_read: false,
      delivered_at: null,
      read_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    notificationTemplate,
    owner,
  });
  const created = await MyGlobal.prisma.shopping_mall_user_notifications.create(
    {
      data,
    },
  );
  function safeDateToString(date: Date | null | undefined): string | null {
    return date == null ? null : toISOStringSafe(date);
  }
  return {
    id: created.id,
    notification_template_id: created.notification_template_id,
    owner_id: created.owner_id,
    owner_type: created.owner_type,
    title: created.title,
    body: created.body,
    url: created.url ?? null,
    image_url: created.image_url ?? null,
    is_read: created.is_read,
    delivered_at: safeDateToString(created.delivered_at),
    read_at: safeDateToString(created.read_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: safeDateToString(created.deleted_at),
  };
}
