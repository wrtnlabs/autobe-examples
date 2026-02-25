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
import { ShoppingMallUserNotificationPreferenceTransformer } from "../transformers/ShoppingMallUserNotificationPreferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdministratorUserNotificationPreferencesPreferenceId(props: {
  administrator: AdministratorPayload;
  preferenceId: string & tags.Format<"uuid">;
  body: IShoppingMallUserNotificationPreference.IUpdate;
}): Promise<IShoppingMallUserNotificationPreference> {
  const preference =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findUniqueOrThrow(
      {
        where: { id: props.preferenceId },
        select: { id: true, administrator_id: true },
      },
    );
  if (preference.administrator_id !== props.administrator.id) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const updated =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.update({
      where: { id: props.preferenceId },
      data: {
        channel_name: props.body.channelName,
        notification_type: props.body.notificationType,
        is_enabled: props.body.isEnabled,
        updated_at: now,
      },
      ...ShoppingMallUserNotificationPreferenceTransformer.select(),
    });
  return await ShoppingMallUserNotificationPreferenceTransformer.transform(
    updated,
  );
}
