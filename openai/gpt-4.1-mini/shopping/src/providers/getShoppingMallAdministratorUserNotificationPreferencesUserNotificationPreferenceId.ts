import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getShoppingMallAdministratorUserNotificationPreferencesUserNotificationPreferenceId(props: {
  administrator: AdministratorPayload;
  userNotificationPreferenceId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallUserNotificationPreference> {
  const record =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findUnique(
      {
        where: { id: props.userNotificationPreferenceId },
        select: {
          id: true,
          customer_id: true,
          seller_id: true,
          administrator_id: true,
          channel_name: true,
          notification_type: true,
          is_enabled: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (!record || record.deleted_at !== null) {
    throw new HttpException("User notification preference not found", 404);
  }
  const toDateTimeString = (
    date: unknown,
  ): (string & tags.Format<"date-time">) | null => {
    if (date === null || date === undefined) return null;
    if (typeof date === "string")
      return date as string & tags.Format<"date-time">;
    return (
      date instanceof Date ? date.toISOString() : String(date)
    ) as string & tags.Format<"date-time">;
  };
  return {
    id: record.id,
    customer_id: record.customer_id ?? null,
    seller_id: record.seller_id ?? null,
    administrator_id: record.administrator_id ?? null,
    channel_name: record.channel_name,
    notification_type: record.notification_type,
    is_enabled: record.is_enabled,
    created_at: toDateTimeString(record.created_at),
    updated_at: toDateTimeString(record.updated_at),
    deleted_at: toDateTimeString(record.deleted_at),
  };
}
