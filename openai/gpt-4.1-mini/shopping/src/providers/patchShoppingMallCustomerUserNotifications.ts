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

export async function patchShoppingMallCustomerUserNotifications(props: {
  customer: CustomerPayload;
  body: IShoppingMallUserNotification.IRequest;
}): Promise<IPageIShoppingMallUserNotification.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const where = {
    owner_id: props.customer.id,
    owner_type: "customer",
    deleted_at: null,
  };
  const [notifications, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_user_notifications.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ delivered_at: "desc" }, { created_at: "desc" }],
    }),
    MyGlobal.prisma.shopping_mall_user_notifications.count({ where }),
  ]);
  return {
    data: notifications.map((n) => ({
      id: n.id,
      owner_id: n.owner_id,
      owner_type: n.owner_type,
      title: n.title,
      content: n.body, // use body instead of non-existing content
      is_read: n.is_read,
      delivered_at: n.delivered_at ? toISOStringSafe(n.delivered_at) : null, // safely pass null
      created_at: toISOStringSafe(n.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
