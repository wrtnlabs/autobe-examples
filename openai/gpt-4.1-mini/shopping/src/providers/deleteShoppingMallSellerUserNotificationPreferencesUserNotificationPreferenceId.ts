import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallSellerUserNotificationPreferencesUserNotificationPreferenceId(props: {
  seller: SellerPayload;
  userNotificationPreferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const record =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findUnique(
      {
        where: { id: props.userNotificationPreferenceId },
        select: { id: true, seller_id: true },
      },
    );
  if (!record) {
    throw new HttpException("User notification preference not found", 404);
  }
  if (record.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_user_notification_preferences.delete({
    where: { id: props.userNotificationPreferenceId },
  });
}
