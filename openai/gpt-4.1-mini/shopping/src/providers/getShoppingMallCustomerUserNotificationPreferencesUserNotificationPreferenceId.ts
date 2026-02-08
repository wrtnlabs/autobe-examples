import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getShoppingMallCustomerUserNotificationPreferencesUserNotificationPreferenceId(props: {
  customer: CustomerPayload;
  userNotificationPreferenceId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallUserNotificationPreference> {
  const record =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findUnique(
      {
        where: { id: props.userNotificationPreferenceId },
      },
    );
  if (!record) {
    throw new HttpException("User notification preference not found", 404);
  }
  if (record.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    customer_id: record.customer_id ?? null,
    seller_id: record.seller_id ?? null,
    administrator_id: record.administrator_id ?? null,
    channel_name: record.channel_name ?? null,
    notification_type: record.notification_type ?? null,
    is_enabled: record.is_enabled,
    created_at: record.created_at ? toISOStringSafe(record.created_at) : "",
    updated_at: record.updated_at ? toISOStringSafe(record.updated_at) : "",
    deleted_at: record.deleted_at ?? null,
  };
}
