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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerNotificationsSummary(props: {
  customer: CustomerPayload;
}): Promise<IPageIShoppingMallUserNotification.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const where = {
    owner_id: props.customer.id,
  } satisfies Prisma.shopping_mall_user_notificationsWhereInput;
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
        notification_template_id: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_user_notifications.count({ where }),
  ]);
  if (total === 0) {
    throw new HttpException("No notifications found.", 404);
  }
  return {
    data: notifications.map((record) => ({
      id: record.id,
      title: record.title,
      body: record.body,
      is_read: record.is_read,
      delivered_at:
        record.delivered_at === null
          ? null
          : toISOStringSafe(record.delivered_at),
      read_at: record.read_at === null ? null : toISOStringSafe(record.read_at),
      template_code: null,
      template_name: null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
