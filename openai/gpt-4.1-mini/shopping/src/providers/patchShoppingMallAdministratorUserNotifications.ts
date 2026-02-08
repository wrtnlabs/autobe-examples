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

export async function patchShoppingMallAdministratorUserNotifications(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallUserNotification.IRequest;
}): Promise<IPageIShoppingMallUserNotification.ISummary> {
  const page: number = 1;
  const limit: number = 100;
  const skip = (page - 1) * limit;
  const where = {
    owner_id: props.administrator.id,
    owner_type: "administrator",
  };
  const data = await MyGlobal.prisma.shopping_mall_user_notifications.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ delivered_at: "desc" }, { created_at: "desc" }],
    select: {
      id: true,
      title: true,
      body: true,
      is_read: true,
      delivered_at: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_user_notifications.count({
    where,
  });
  const resultData: IShoppingMallUserNotification.ISummary[] = data.map(
    (record) => ({
      id: record.id,
      title: record.title,
      body: record.body === null ? undefined : record.body,
      is_read: record.is_read,
      delivered_at:
        record.delivered_at === null
          ? null
          : toISOStringSafe(record.delivered_at),
      created_at: toISOStringSafe(record.created_at),
    }),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: resultData,
  };
}
