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

export async function patchShoppingMallSellerUserNotifications(props: {
  seller: SellerPayload;
  body: IShoppingMallUserNotification.IRequest;
}): Promise<IPageIShoppingMallUserNotification.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = 0;
  const where: Prisma.shopping_mall_user_notificationsWhereInput = {
    owner_id: props.seller.id,
    owner_type: "seller",
  };
  const data = await MyGlobal.prisma.shopping_mall_user_notifications.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ delivered_at: "desc" }, { created_at: "desc" }],
  });
  const total = await MyGlobal.prisma.shopping_mall_user_notifications.count({
    where,
  });
  const records: IShoppingMallUserNotification.ISummary[] = data.map(
    (record) => ({
      id: record.id,
      title: record.title ?? undefined,
      body: record.body ?? undefined,
      is_read: record.is_read ?? false,
      delivered_at: record.delivered_at
        ? toISOStringSafe(record.delivered_at)
        : null,
      created_at: record.created_at ? toISOStringSafe(record.created_at) : null,
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: records,
  };
}
