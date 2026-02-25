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
import { ShoppingMallUserNotificationPreferenceTransformer } from "../transformers/ShoppingMallUserNotificationPreferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerUserNotificationPreferencesPreferenceId(props: {
  customer: CustomerPayload;
  preferenceId: string & tags.Format<"uuid">;
  body: IShoppingMallUserNotificationPreference.IUpdate;
}): Promise<IShoppingMallUserNotificationPreference> {
  // Fetch the preference and ensure it exists
  const preference =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findUniqueOrThrow(
      {
        where: { id: props.preferenceId },
        select: {
          id: true,
          customer_id: true,
          seller_id: true,
          administrator_id: true,
        },
      },
    );
  // Authorization: check ownership belongs to the authenticated customer
  if (preference.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Prepare updated_at as string & tags.Format<'date-time'> without using 'as'
  const updatedAtISO = new Date().toISOString();
  // Update resource with new values, preserving ownership fields
  await MyGlobal.prisma.shopping_mall_user_notification_preferences.update({
    where: { id: props.preferenceId },
    data: {
      channel_name: props.body.channelName,
      notification_type: props.body.notificationType,
      is_enabled: props.body.isEnabled,
      updated_at: updatedAtISO,
    },
  });
  // Re-fetch the updated row with full select
  const updated =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findUniqueOrThrow(
      {
        where: { id: props.preferenceId },
        ...ShoppingMallUserNotificationPreferenceTransformer.select(),
      },
    );
  // Transform to API DTO
  return await ShoppingMallUserNotificationPreferenceTransformer.transform(
    updated,
  );
}
