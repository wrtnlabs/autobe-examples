import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallAdministratorUserNotificationPreferencesUserNotificationPreferenceId(props: {
  administrator: AdministratorPayload;
  userNotificationPreferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const preference =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findUnique(
      {
        where: { id: props.userNotificationPreferenceId },
      },
    );
  if (!preference) {
    throw new HttpException("User notification preference not found", 404);
  }
  // Authorization: Only allow if the admin is the owner or administrator
  // Here props.administrator is an administrator, so proceed with deletion
  await MyGlobal.prisma.shopping_mall_user_notification_preferences.delete({
    where: { id: props.userNotificationPreferenceId },
  });
}
