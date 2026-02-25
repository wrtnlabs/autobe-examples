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

export async function deleteShoppingMallSellerUserNotificationPreferencesPreferenceId(props: {
  seller: SellerPayload;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if preference exists and is owned by the seller
  const preference =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findUnique(
      {
        where: { id: props.preferenceId },
        select: { id: true, seller_id: true },
      },
    );
  if (preference === null) {
    throw new HttpException("Notification preference not found", 404);
  }
  if (preference.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete the notification preference
  await MyGlobal.prisma.shopping_mall_user_notification_preferences.delete({
    where: { id: props.preferenceId },
  });
  return;
}
