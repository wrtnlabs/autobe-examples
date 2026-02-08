import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerUserNotificationsUserNotificationId(props: {
  customer: CustomerPayload;
  userNotificationId: string & tags.Format<"uuid">;
  body: IShoppingMallUserNotification.IUpdate;
}): Promise<IShoppingMallUserNotification> {
  const notification =
    await MyGlobal.prisma.shopping_mall_user_notifications.findUnique({
      where: { id: props.userNotificationId },
    });
  if (!notification) {
    throw new HttpException("User notification not found", 404);
  }
  if (
    notification.owner_id !== props.customer.id ||
    notification.owner_type !== "customer"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.shopping_mall_user_notifications.update(
    {
      where: { id: props.userNotificationId },
      data: {
        title: (props.body as any).title ?? null,
        body: (props.body as any).body ?? null,
        url: (props.body as any).url ?? null,
        image_url: (props.body as any).imageUrl ?? null,
        is_read: (props.body as any).isRead ?? null,
        delivered_at: toISOStringSafe((props.body as any).deliveredAt) ?? null,
        read_at: toISOStringSafe((props.body as any).readAt) ?? null,
      },
    },
  );
  return updated;
}
