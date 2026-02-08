import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotificationPreference";
import { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
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

export async function patchShoppingMallCustomerUserNotificationPreferences(props: {
  customer: CustomerPayload;
  body: IShoppingMallUserNotificationPreference.IRequest;
}): Promise<IPageIShoppingMallUserNotificationPreference.ISummary> {
  const page: number = 1;
  const limit: number = 100;
  const skip: number = (page - 1) * limit;
  const where = {
    deleted_at: null,
    customer_id: props.customer.id,
  };
  const total: number =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.count({
      where,
    });
  const data =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {},
    });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
