import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallCustomerUserNotificationPreferencesUserNotificationPreferenceId(props: {
  customer: CustomerPayload;
  userNotificationPreferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const preference =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findUnique(
      {
        where: { id: props.userNotificationPreferenceId },
        select: { id: true, customer_id: true },
      },
    );
  if (!preference) {
    throw new HttpException("User notification preference not found", 404);
  }
  if (preference.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_user_notification_preferences.delete({
    where: { id: props.userNotificationPreferenceId },
  });
}
