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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerUserNotifications(props: {
  seller: SellerPayload;
  body: IShoppingMallUserNotification.ICreate;
}): Promise<IShoppingMallUserNotification> {
  const notification = props.body as IShoppingMallUserNotification.ICreate & {
    owner_type: "customer" | "seller" | "administrator";
    notification_template_id: string;
    owner_id: string;
    title: string;
    body: string;
    url?: string | null;
    image_url?: string | null;
  };
  const { seller } = props;
  const validOwnerTypes = ["customer", "seller", "administrator"] as const;
  if (!validOwnerTypes.includes(notification.owner_type)) {
    throw new HttpException(
      `Invalid owner_type: ${notification.owner_type}`,
      400,
    );
  }
  const uuidv4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidv4Regex.test(notification.notification_template_id)) {
    throw new HttpException(`Invalid notification_template_id format`, 400);
  }
  if (!uuidv4Regex.test(notification.owner_id)) {
    throw new HttpException(`Invalid owner_id format`, 400);
  }
  if (notification.title.trim().length === 0) {
    throw new HttpException(`title is required and must be non-empty`, 400);
  }
  if (notification.body.trim().length === 0) {
    throw new HttpException(`body is required and must be non-empty`, 400);
  }
  const now = toISOStringSafe(new Date());
  try {
    const createInput = await ShoppingMallUserNotificationCollector.collect({
      body: {
        notification_template_id: notification.notification_template_id,
        owner_id: notification.owner_id,
        owner_type: notification.owner_type,
        title: notification.title,
        body: notification.body,
        url: notification.url ?? null,
        image_url: notification.image_url ?? null,
        is_read: false,
        delivered_at: null,
        read_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      notificationTemplate: { id: notification.notification_template_id },
      owner: { id: notification.owner_id },
    });
    const created =
      await MyGlobal.prisma.shopping_mall_user_notifications.create({
        data: createInput,
      });
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
      delivered_at: created.delivered_at
        ? toISOStringSafe(created.delivered_at)
        : null,
      read_at: created.read_at ? toISOStringSafe(created.read_at) : null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new HttpException(
        "Notification template or owner does not exist",
        400,
      );
    }
    throw error;
  }
}
