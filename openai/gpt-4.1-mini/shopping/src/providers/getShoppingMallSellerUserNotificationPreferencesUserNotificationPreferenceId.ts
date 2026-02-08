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

export async function getShoppingMallSellerUserNotificationPreferencesUserNotificationPreferenceId(props: {
  seller: SellerPayload;
  userNotificationPreferenceId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallUserNotificationPreference> {
  const record =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findUnique(
      {
        where: { id: props.userNotificationPreferenceId },
      },
    );
  if (record === null || record.deleted_at !== null) {
    throw new HttpException("User notification preference not found", 404);
  }
  if (record.seller_id !== props.seller.id) {
    throw new HttpException("User notification preference not found", 404);
  }
  return {
    customer_id: record.customer_id,
    seller_id: record.seller_id,
    administrator_id: record.administrator_id,
    channel_name: record.channel_name,
    notification_type: record.notification_type,
    is_enabled: record.is_enabled,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
