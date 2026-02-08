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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorUserNotifications(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallUserNotification.ICreate;
}): Promise<IShoppingMallUserNotification> {
  const body = props.body;
  const notification_template_id = (body as any).notification_template_id as
    | string
    | undefined;
  const owner_id = (body as any).owner_id as string | undefined;
  const owner_type = (body as any).owner_type as string | undefined;
  const title = (body as any).title as string | undefined;
  const notifBody = (body as any).body as string | undefined;
  const url = (body as any).url !== undefined ? (body as any).url : null;
  const image_url =
    (body as any).image_url !== undefined ? (body as any).image_url : null;
  if (typeof notification_template_id !== "string") {
    throw new HttpException(
      "notification_template_id is missing or invalid",
      400,
    );
  }
  if (typeof owner_id !== "string") {
    throw new HttpException("owner_id is missing or invalid", 400);
  }
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(notification_template_id)) {
    throw new HttpException(
      "Invalid notification_template_id UUID format",
      400,
    );
  }
  if (!uuidRegex.test(owner_id)) {
    throw new HttpException("Invalid owner_id UUID format", 400);
  }
  const allowedOwnerTypes = ["customer", "seller", "administrator"] as const;
  if (
    typeof owner_type !== "string" ||
    !allowedOwnerTypes.includes(owner_type as any)
  ) {
    throw new HttpException(
      `Invalid owner_type; must be one of ${allowedOwnerTypes.join(", ")}`,
      400,
    );
  }
  if (typeof title !== "string" || title.trim().length === 0) {
    throw new HttpException(
      "title is required and must be a non-empty string",
      400,
    );
  }
  if (typeof notifBody !== "string" || notifBody.trim().length === 0) {
    throw new HttpException(
      "body is required and must be a non-empty string",
      400,
    );
  }
  const notificationTemplateRecord =
    await MyGlobal.prisma.shopping_mall_notification_templates.findUnique({
      where: { id: notification_template_id },
    });
  if (!notificationTemplateRecord) {
    throw new HttpException("Notification template not found", 404);
  }
  if (owner_type !== "customer") {
    throw new HttpException(
      `Unsupported owner_type '${owner_type}'; only 'customer' is supported in this implementation`,
      400,
    );
  }
  const ownerRecord = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: owner_id },
  });
  if (!ownerRecord) {
    throw new HttpException("Owner not found", 404);
  }
  const createInput = await ShoppingMallUserNotificationCollector.collect({
    body: props.body,
    notificationTemplate: notificationTemplateRecord,
    owner: ownerRecord,
  });
  createInput.url = url;
  createInput.image_url = image_url;
  createInput.is_read = false;
  createInput.delivered_at = null;
  createInput.read_at = null;
  createInput.title = title;
  createInput.body = notifBody;
  createInput.owner_type = owner_type;
  let createdRecord;
  try {
    createdRecord =
      await MyGlobal.prisma.shopping_mall_user_notifications.create({
        data: createInput,
      });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        throw new HttpException("Foreign key constraint failed", 400);
      }
    }
    throw error;
  }
  function toUuid(uuid: string): string & import("typia").tags.Format<"uuid"> {
    return uuid as unknown as string & import("typia").tags.Format<"uuid">;
  }
  function toDateTimeString(
    dt: Date | null,
  ): (string & import("typia").tags.Format<"date-time">) | null {
    if (dt === null) return null;
    return toISOStringSafe(dt) as string &
      import("typia").tags.Format<"date-time">;
  }
  return {
    id: toUuid(createdRecord.id),
    notification_template_id: toUuid(createdRecord.notification_template_id),
    owner_id: toUuid(createdRecord.owner_id),
    owner_type: createdRecord.owner_type,
    title: createdRecord.title,
    body: createdRecord.body,
    url: createdRecord.url === null ? null : createdRecord.url,
    image_url:
      createdRecord.image_url === null ? null : createdRecord.image_url,
    is_read: createdRecord.is_read,
    delivered_at: toDateTimeString(createdRecord.delivered_at),
    read_at: toDateTimeString(createdRecord.read_at),
    created_at: toISOStringSafe(createdRecord.created_at) as string &
      import("typia").tags.Format<"date-time">,
    updated_at: toISOStringSafe(createdRecord.updated_at) as string &
      import("typia").tags.Format<"date-time">,
    deleted_at: toDateTimeString(createdRecord.deleted_at),
  };
}
