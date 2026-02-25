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

export async function putShoppingMallAdministratorNotificationsPreferences(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallUserNotificationPreference.IUpdate;
}): Promise<void> {
  const updateResult =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.updateMany(
      {
        where: { administrator_id: props.administrator.id },
        data: {
          channel_name: props.body.channelName,
          notification_type: props.body.notificationType,
          is_enabled: props.body.isEnabled,
          updated_at: new Date(),
        },
      },
    );
  if (updateResult.count === 0) {
    throw new HttpException("Forbidden", 403);
  }
}
