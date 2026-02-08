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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorUserNotificationPreferences(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallUserNotificationPreference.IRequest;
}): Promise<IPageIShoppingMallUserNotificationPreference.ISummary> {
  // Since props.body does not have page and limit properties, default pagination values
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const where = {
    deleted_at: null,
    administrator_id: props.administrator.id,
  } satisfies Prisma.shopping_mall_user_notification_preferencesWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.count({
      where,
    });
  return {
    data: data.map((record) => ({
      channel_name: record.channel_name,
      id: record.id,
      notification_type: record.notification_type,
      administrator_id: record.administrator_id,
      customer_id: record.customer_id === null ? null : record.customer_id,
      deleted_at: null,
      seller_id: record.seller_id === null ? null : record.seller_id,
      updated_at: toISOStringSafe(record.updated_at),
      created_at: toISOStringSafe(record.created_at),
      enabled: record.is_enabled,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
