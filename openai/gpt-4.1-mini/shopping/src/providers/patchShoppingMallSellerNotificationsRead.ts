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
import { ShoppingMallUserNotificationAtSummaryTransformer } from "../transformers/ShoppingMallUserNotificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerNotificationsRead(props: {
  seller: SellerPayload;
  body: IShoppingMallUserNotification.IMarkRead;
}): Promise<IShoppingMallUserNotification.ISummary[]> {
  const now = new Date().toISOString();
  // We accept and return plain string format because our types expect string & tags.Format<'date-time'>
  const nowStr = now as string & tags.Format<"date-time">;
  const { notificationIds } = props.body;
  const notifications =
    await MyGlobal.prisma.shopping_mall_user_notifications.findMany({
      where: {
        id: { in: notificationIds },
        owner_id: props.seller.id,
        owner_type: "seller",
      },
    });
  if (notifications.length !== notificationIds.length) {
    throw new HttpException(
      "One or more notifications not found or unauthorized",
      404,
    );
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_user_notifications.updateMany({
      where: {
        id: { in: notificationIds },
        owner_id: props.seller.id,
        owner_type: "seller",
      },
      data: {
        is_read: true,
        read_at: nowStr,
        updated_at: nowStr,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_user_notifications.findMany({
      where: {
        id: { in: notificationIds },
        owner_id: props.seller.id,
        owner_type: "seller",
      },
      ...ShoppingMallUserNotificationAtSummaryTransformer.select(),
    });
  return await Promise.all(
    updated.map((record) =>
      ShoppingMallUserNotificationAtSummaryTransformer.transform(record),
    ),
  );
}
