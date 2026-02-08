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

export async function putShoppingMallSellerNotificationsPreferences(props: {
  seller: SellerPayload;
  body: IShoppingMallUserNotificationPreference.IUpdateMany;
}): Promise<IShoppingMallUserNotificationPreference[]> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  if (!Array.isArray(props.body) || props.body.length === 0) {
    throw new HttpException("Request body must be a non-empty array", 400);
  }
  const preferences = props.body;
  // Validate each preference data using runtime type check
  for (const pref of preferences) {
    if (
      typeof (pref as any).channel_name !== "string" ||
      typeof (pref as any).notification_type !== "string" ||
      typeof (pref as any).is_enabled !== "boolean"
    ) {
      throw new HttpException("Invalid preference data format", 400);
    }
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    for (const pref of preferences) {
      await tx.shopping_mall_user_notification_preferences.upsert({
        where: {
          seller_id_channel_name_notification_type: {
            seller_id: props.seller.id,
            channel_name: (pref as any).channel_name,
            notification_type: (pref as any).notification_type,
          },
        },
        create: {
          id: v4(),
          seller_id: props.seller.id,
          channel_name: (pref as any).channel_name,
          notification_type: (pref as any).notification_type,
          is_enabled: (pref as any).is_enabled,
          created_at: now,
          updated_at: now,
        },
        update: {
          is_enabled: (pref as any).is_enabled,
          updated_at: now,
        },
      });
    }
    const updated =
      await tx.shopping_mall_user_notification_preferences.findMany({
        where: { seller_id: props.seller.id },
        orderBy: { channel_name: "asc" },
      });
    return updated.map((p) => ({
      id: p.id,
      customer_id: p.customer_id ?? null,
      seller_id: p.seller_id ?? null,
      administrator_id: p.administrator_id ?? null,
      channel_name: p.channel_name,
      notification_type: p.notification_type,
      is_enabled: p.is_enabled,
      created_at: toISOStringSafe(p.created_at),
      updated_at: toISOStringSafe(p.updated_at),
    }));
  });
}
