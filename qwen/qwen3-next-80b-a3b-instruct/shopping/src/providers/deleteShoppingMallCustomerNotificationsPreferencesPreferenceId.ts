import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallCustomerNotificationsPreferencesPreferenceId(props: {
  preferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const preference =
    await MyGlobal.prisma.shopping_mall_notification_preferences.findUnique({
      where: { id: props.preferenceId },
    });

  if (!preference) {
    throw new HttpException("Notification preference not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_notification_preferences.delete({
    where: { id: props.preferenceId },
  });
}
