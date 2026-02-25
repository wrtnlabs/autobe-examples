import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallUserNotificationAtSummaryTransformer } from "../transformers/ShoppingMallUserNotificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorNotificationsRead(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallUserNotification.IMarkRead;
}): Promise<IShoppingMallUserNotification.ISummary[]> {
  function getNow(): string & tags.Format<"date-time"> {
    return new Date().toISOString() as unknown as string &
      tags.Format<"date-time">;
  }
  const now = getNow();
  const notifications =
    await MyGlobal.prisma.shopping_mall_user_notifications.findMany({
      where: {
        id: { in: props.body.notificationIds },
      },
      select: {
        id: true,
        owner_id: true,
        owner_type: true,
      },
    });
  if (notifications.length !== props.body.notificationIds.length) {
    throw new HttpException("Some notifications not found", 404);
  }
  for (const notification of notifications) {
    if (
      notification.owner_id !== props.administrator.id ||
      notification.owner_type !== "administrator"
    ) {
      throw new HttpException("Forbidden", 403);
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_user_notifications.updateMany({
      where: {
        id: { in: props.body.notificationIds },
      },
      data: {
        is_read: true,
        read_at: now,
      },
    });
  });
  const updatedNotifications =
    await MyGlobal.prisma.shopping_mall_user_notifications.findMany({
      where: {
        id: { in: props.body.notificationIds },
      },
      ...ShoppingMallUserNotificationAtSummaryTransformer.select(),
    });
  return await ArrayUtil.asyncMap(
    updatedNotifications,
    ShoppingMallUserNotificationAtSummaryTransformer.transform,
  );
}
