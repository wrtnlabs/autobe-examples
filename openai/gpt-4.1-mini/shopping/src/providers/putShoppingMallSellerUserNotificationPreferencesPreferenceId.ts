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
import { ShoppingMallUserNotificationPreferenceTransformer } from "../transformers/ShoppingMallUserNotificationPreferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerUserNotificationPreferencesPreferenceId(props: {
  seller: SellerPayload;
  preferenceId: string & tags.Format<"uuid">;
  body: IShoppingMallUserNotificationPreference.IUpdate;
}): Promise<IShoppingMallUserNotificationPreference> {
  const found =
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
  if (found.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updated =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.update({
      where: { id: props.preferenceId },
      data: {
        channel_name: props.body.channelName,
        notification_type: props.body.notificationType,
        is_enabled: props.body.isEnabled,
        updated_at: new Date(),
      },
      ...ShoppingMallUserNotificationPreferenceTransformer.select(),
    });
  return await ShoppingMallUserNotificationPreferenceTransformer.transform(
    updated,
  );
}
