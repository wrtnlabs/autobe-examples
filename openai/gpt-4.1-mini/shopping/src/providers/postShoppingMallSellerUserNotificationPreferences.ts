import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function postShoppingMallSellerUserNotificationPreferences(props: {
  seller: SellerPayload;
  body: IShoppingMallUserNotificationPreference.ICreate;
}): Promise<IShoppingMallUserNotificationPreference> {
  const { seller, body } = props;
  const providedOwners = [
    "customer_id" in body &&
      body.customer_id !== undefined &&
      body.customer_id !== null,
    "seller_id" in body &&
      body.seller_id !== undefined &&
      body.seller_id !== null,
    "administrator_id" in body &&
      body.administrator_id !== undefined &&
      body.administrator_id !== null,
  ].filter(Boolean).length;
  if (providedOwners !== 1) {
    throw new HttpException(
      "Exactly one of customer_id, seller_id, or administrator_id must be provided",
      400,
    );
  }
  if ("seller_id" in body && body.seller_id !== seller.id) {
    throw new HttpException(
      "Forbidden: seller_id does not match authenticated seller",
      403,
    );
  }
  const channel_name =
    typeof (body as any).channel_name === "string"
      ? (body as any).channel_name
      : "";
  const notification_type =
    typeof (body as any).notification_type === "string"
      ? (body as any).notification_type
      : "";
  const is_enabled =
    typeof (body as any).is_enabled === "boolean"
      ? (body as any).is_enabled
      : false;
  const now = toISOStringSafe(new Date());
  let where: Prisma.shopping_mall_user_notification_preferencesWhereUniqueInput;
  const createDataBase: Omit<
    Prisma.shopping_mall_user_notification_preferencesCreateInput,
    "customer" | "seller" | "administrator"
  > = {
    id: v4(),
    channel_name: channel_name,
    notification_type: notification_type,
    is_enabled: is_enabled,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  if ("customer_id" in body && body.customer_id != null) {
    where = {
      customer_id_channel_name_notification_type: {
        customer_id: String(body.customer_id),
        channel_name: channel_name,
        notification_type: notification_type,
      },
    };
    return await updateOrCreatePreference({
      where,
      createData: {
        ...createDataBase,
        customer: { connect: { id: String(body.customer_id) } },
      },
      is_enabled,
      now,
    });
  } else if ("seller_id" in body && body.seller_id != null) {
    where = {
      seller_id_channel_name_notification_type: {
        seller_id: String(body.seller_id),
        channel_name: channel_name,
        notification_type: notification_type,
      },
    };
    return await updateOrCreatePreference({
      where,
      createData: {
        ...createDataBase,
        seller: { connect: { id: String(body.seller_id) } },
      },
      is_enabled,
      now,
    });
  } else if ("administrator_id" in body && body.administrator_id != null) {
    where = {
      administrator_id_channel_name_notification_type: {
        administrator_id: String(body.administrator_id),
        channel_name: channel_name,
        notification_type: notification_type,
      },
    };
    return await updateOrCreatePreference({
      where,
      createData: {
        ...createDataBase,
        administrator: { connect: { id: String(body.administrator_id) } },
      },
      is_enabled,
      now,
    });
  } else {
    throw new HttpException(
      "Exactly one of customer_id, seller_id, or administrator_id must be provided",
      400,
    );
  }
}
async function updateOrCreatePreference(props: {
  where: Prisma.shopping_mall_user_notification_preferencesWhereUniqueInput;
  createData: Prisma.shopping_mall_user_notification_preferencesCreateInput;
  is_enabled: boolean;
  now: string;
}): Promise<IShoppingMallUserNotificationPreference> {
  const { where, createData, is_enabled, now } = props;
  const updateData: Prisma.shopping_mall_user_notification_preferencesUpdateInput =
    {
      is_enabled: is_enabled,
      updated_at: now,
    };
  const result =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.upsert({
      where,
      update: updateData,
      create: createData,
    });
  return {
    id: result.id,
    customer_id: result.customer_id ?? null,
    seller_id: result.seller_id ?? null,
    administrator_id: result.administrator_id ?? null,
    channel_name: result.channel_name,
    notification_type: result.notification_type,
    is_enabled: result.is_enabled,
    created_at: result.created_at,
    updated_at: result.updated_at,
    deleted_at: result.deleted_at ?? null,
  };
}
