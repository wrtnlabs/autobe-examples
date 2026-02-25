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
import { ShoppingMallUserNotificationAtSummaryTransformer } from "../transformers/ShoppingMallUserNotificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerNotificationsRead(props: {
  customer: CustomerPayload;
  body: IShoppingMallUserNotification.IMarkRead;
}): Promise<IShoppingMallUserNotification.ISummary[]> {
  const now = typia.assert<string & tags.Format<"date-time">>(
    new Date().toISOString(),
  );
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const count = await tx.shopping_mall_user_notifications.count({
      where: {
        id: { in: props.body.notificationIds },
        owner_id: props.customer.id,
      },
    });
    if (count !== props.body.notificationIds.length) {
      throw new HttpException(
        "One or more notifications not found or unauthorized",
        404,
      );
    }
    await tx.shopping_mall_user_notifications.updateMany({
      where: {
        id: { in: props.body.notificationIds },
        owner_id: props.customer.id,
      },
      data: {
        is_read: true,
        read_at: now,
      },
    });
    const updatedRecords = await tx.shopping_mall_user_notifications.findMany({
      where: {
        id: { in: props.body.notificationIds },
        owner_id: props.customer.id,
      },
      ...ShoppingMallUserNotificationAtSummaryTransformer.select(),
    });
    return await Promise.all(
      updatedRecords.map(
        ShoppingMallUserNotificationAtSummaryTransformer.transform,
      ),
    );
  });
}
