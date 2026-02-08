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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorNotificationsSummary(props: {
  administrator: AdministratorPayload;
}): Promise<IPageIShoppingMallUserNotification.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const whereCondition = { owner_id: props.administrator.id };
  const [notifications, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_user_notifications.findMany({
      where: whereCondition,
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
        notificationTemplate: {
          select: {
            template_code: true,
            template_name: true,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_user_notifications.count({
      where: whereCondition,
    }),
  ]);
  return {
    data: notifications.map((notif) => ({
      id: notif.id,
      title: notif.title,
      body: notif.body,
      is_read: notif.is_read,
      delivered_at: notif.delivered_at
        ? toISOStringSafe(notif.delivered_at)
        : null,
      read_at: notif.read_at ? toISOStringSafe(notif.read_at) : null,
      template_code: notif.notificationTemplate?.template_code ?? null,
      template_name: notif.notificationTemplate?.template_name ?? null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
