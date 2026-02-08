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
  body: IShoppingMallUserNotificationPreference.IUpdateMany;
}): Promise<IShoppingMallUserNotificationPreference[]> {
  if (!props.body || Object.keys(props.body).length === 0) {
    return [];
  }
  const administratorId = props.administrator.id;
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const now = toISOStringSafe(new Date());
    const preferences = Object.values(props.body) as unknown as Array<{
      channelName: string;
      notificationType: string;
      isEnabled: boolean;
    }>;
    for (const preference of preferences) {
      await prisma.shopping_mall_user_notification_preferences.upsert({
        where: {
          administrator_id_channel_name_notification_type: {
            administrator_id: administratorId,
            channel_name: preference.channelName,
            notification_type: preference.notificationType,
          },
        },
        update: {
          is_enabled: preference.isEnabled,
          updated_at: now,
        },
        create: {
          id: v4(),
          administrator_id: administratorId,
          channel_name: preference.channelName,
          notification_type: preference.notificationType,
          is_enabled: preference.isEnabled,
          created_at: now,
          updated_at: now,
        },
      });
    }
  });
  const updatedPreferences =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findMany({
      where: { administrator_id: administratorId },
    });
  return updatedPreferences;
}
