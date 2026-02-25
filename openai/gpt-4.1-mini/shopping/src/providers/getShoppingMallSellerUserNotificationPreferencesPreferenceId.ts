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

export async function getShoppingMallSellerUserNotificationPreferencesPreferenceId(props: {
  seller: SellerPayload;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallUserNotificationPreference> {
  const preference =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findUniqueOrThrow(
      {
        where: { id: props.preferenceId },
        select: {
          id: true,
          customer: { select: { id: true } },
          seller: { select: { id: true } },
          administrator: { select: { id: true } },
          channel_name: true,
          notification_type: true,
          is_enabled: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (preference.seller?.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallUserNotificationPreferenceTransformer.transform(
    preference,
  );
}
