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

export async function putShoppingMallCustomerUserNotificationPreferencesUserNotificationPreferenceId(props: {
  customer: CustomerPayload;
  userNotificationPreferenceId: string & tags.Format<"uuid">;
  body: IShoppingMallUserNotificationPreference.IUpdate;
}): Promise<IShoppingMallUserNotificationPreference> {
  const preference =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findUnique(
      {
        where: { id: props.userNotificationPreferenceId },
      },
    );
  if (!preference) {
    throw new HttpException("Notification preference not found", 404);
  }
  if (preference.customer_id !== props.customer.id) {
    throw new HttpException("Access denied", 403);
  }
  // IUpdate DTO is empty, so no actual data updated
  // Return current state of preference
  return {
    id: preference.id,
    customer_id: preference.customer_id ?? undefined,
    seller_id: preference.seller_id ?? undefined,
    administrator_id: preference.administrator_id ?? undefined,
    channel_name: preference.channel_name,
    notification_type: preference.notification_type,
    is_enabled: preference.is_enabled,
    created_at: toISOStringSafe(preference.created_at),
    updated_at: toISOStringSafe(preference.updated_at),
    deleted_at: preference.deleted_at
      ? toISOStringSafe(preference.deleted_at)
      : null,
  };
}
