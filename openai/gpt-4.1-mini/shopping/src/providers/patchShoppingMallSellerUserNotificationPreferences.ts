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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerUserNotificationPreferences(props: {
  seller: SellerPayload;
  body: IShoppingMallUserNotificationPreference.IRequest & {
    page?: number;
    limit?: number;
    channel_name?: string;
    notification_type?: string;
  };
}): Promise<IPageIShoppingMallUserNotificationPreference.ISummary> {
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 ? props.body.limit : 20;
  const skip = (page - 1) * limit;
  const where = {
    seller_id: props.seller.id,
    deleted_at: null,
    ...(props.body.channel_name
      ? { channel_name: props.body.channel_name }
      : {}),
    ...(props.body.notification_type
      ? { notification_type: props.body.notification_type }
      : {}),
  } satisfies Prisma.shopping_mall_user_notification_preferencesWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        seller_id: true,
        administrator_id: true,
        customer_id: true,
        notification_type: true,
        channel_name: true,
        is_enabled: true,
        created_at: true,
        updated_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.count({
      where,
    });
  return {
    data: data.map((item) => ({
      id: item.id,
      owner_type: item.seller_id
        ? "seller"
        : item.administrator_id
          ? "administrator"
          : item.customer_id
            ? "customer"
            : "unknown",
      owner_id:
        item.seller_id ?? item.administrator_id ?? item.customer_id ?? "",
      channel_name: item.channel_name,
      notification_type: item.notification_type,
      enabled: item.is_enabled,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
