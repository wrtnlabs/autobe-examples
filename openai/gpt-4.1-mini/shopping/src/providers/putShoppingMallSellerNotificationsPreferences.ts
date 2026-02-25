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
  body: IShoppingMallUserNotificationPreference.IUpdate;
}): Promise<void> {
  const now: string & import("typia").tags.Format<"date-time"> =
    new Date().toISOString();

  const updated =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.updateMany(
      {
        where: {
          seller_id: props.seller.id,
          channel_name: props.body.channelName,
          notification_type: props.body.notificationType,
        },
        data: {
          is_enabled: props.body.isEnabled,
          updated_at: now,
          deleted_at: null,
        },
      },
    );
  if (updated.count === 0) {
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.create({
      data: {
        id: v4() as string & import("typia").tags.Format<"uuid">,
        seller_id: props.seller.id,
        channel_name: props.body.channelName,
        notification_type: props.body.notificationType,
        is_enabled: props.body.isEnabled,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }
}
