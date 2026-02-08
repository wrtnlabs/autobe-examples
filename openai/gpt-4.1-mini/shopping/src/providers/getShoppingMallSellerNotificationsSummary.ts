import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotification";
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

export async function getShoppingMallSellerNotificationsSummary(props: {
  seller: SellerPayload;
}): Promise<IPageIShoppingMallUserNotification.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const where = { owner_id: props.seller.id };
  const [notifications, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_user_notifications.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        title: true,
        body: true,
        is_read: true,
        delivered_at: true,
        read_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_user_notifications.count({ where }),
  ]);
  if (notifications.length === 0) {
    throw new HttpException("No notifications found", 404);
  }
  const data = notifications.map((n) => {
    return {
      id: n.id,
      title: n.title,
      body: n.body,
      is_read: n.is_read,
      delivered_at:
        n.delivered_at === null ? null : toISOStringSafe(n.delivered_at),
      read_at: n.read_at === null ? null : toISOStringSafe(n.read_at),
    };
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
