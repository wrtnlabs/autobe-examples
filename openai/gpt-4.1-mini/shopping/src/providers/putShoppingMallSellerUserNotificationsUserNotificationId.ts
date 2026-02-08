import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerUserNotificationsUserNotificationId(props: {
  seller: SellerPayload;
  userNotificationId: string & tags.Format<"uuid">;
  body: IShoppingMallUserNotification.IUpdate;
}): Promise<IShoppingMallUserNotification> {
  // Fetch existing notification
  const existing =
    await MyGlobal.prisma.shopping_mall_user_notifications.findUnique({
      where: { id: props.userNotificationId },
    });
  if (!existing) {
    throw new HttpException("User notification not found", 404);
  }
  // Verify ownership
  if (
    !(existing.owner_id === props.seller.id && existing.owner_type === "seller")
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Assemble update data
  const updateData: {
    title?: string;
    body?: string;
    url?: string | null;
    image_url?: string | null;
    is_read?: boolean;
    delivered_at?: string | null;
    read_at?: string | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if ((props.body as any).title !== undefined)
    updateData.title = (props.body as any).title;
  if ((props.body as any).body !== undefined)
    updateData.body = (props.body as any).body;
  if ((props.body as any).url !== undefined)
    updateData.url = (props.body as any).url;
  if ((props.body as any).image_url !== undefined)
    updateData.image_url = (props.body as any).image_url;
  if ((props.body as any).is_read !== undefined)
    updateData.is_read = (props.body as any).is_read;
  if ((props.body as any).delivered_at !== undefined) {
    updateData.delivered_at =
      (props.body as any).delivered_at instanceof Date
        ? toISOStringSafe((props.body as any).delivered_at)
        : ((props.body as any).delivered_at ?? null);
  }
  if ((props.body as any).read_at !== undefined) {
    updateData.read_at =
      (props.body as any).read_at instanceof Date
        ? toISOStringSafe((props.body as any).read_at)
        : ((props.body as any).read_at ?? null);
  }
  // Update record
  const updated = await MyGlobal.prisma.shopping_mall_user_notifications.update(
    {
      where: { id: props.userNotificationId },
      data: updateData,
    },
  );
  // Return mapped response
  return {
    id: updated.id,
    notification_template_id: updated.notification_template_id,
    owner_id: updated.owner_id,
    owner_type: updated.owner_type,
    title: updated.title,
    body: updated.body,
    url: updated.url,
    image_url: updated.image_url,
    is_read: updated.is_read,
    delivered_at: updated.delivered_at,
    read_at: updated.read_at,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    deleted_at: updated.deleted_at,
  };
}
