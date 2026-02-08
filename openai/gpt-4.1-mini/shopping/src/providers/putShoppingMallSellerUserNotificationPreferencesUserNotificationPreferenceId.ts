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

export async function putShoppingMallSellerUserNotificationPreferencesUserNotificationPreferenceId(props: {
  seller: SellerPayload;
  userNotificationPreferenceId: string & tags.Format<"uuid">;
  body: IShoppingMallUserNotificationPreference.IUpdate;
}): Promise<IShoppingMallUserNotificationPreference> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const preference =
      await tx.shopping_mall_user_notification_preferences.findUnique({
        where: { id: props.userNotificationPreferenceId },
      });
    if (!preference) {
      throw new HttpException("User Notification Preference not found", 404);
    }
    if (preference.seller_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
    const updated = await tx.shopping_mall_user_notification_preferences.update(
      {
        where: { id: props.userNotificationPreferenceId },
        data: {
          ...props.body,
        },
      },
    );
    return updated;
  });
}
