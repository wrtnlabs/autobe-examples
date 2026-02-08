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

export async function putShoppingMallAdministratorUserNotificationPreferencesUserNotificationPreferenceId(props: {
  administrator: AdministratorPayload;
  userNotificationPreferenceId: string & tags.Format<"uuid">;
  body: IShoppingMallUserNotificationPreference.IUpdate;
}): Promise<IShoppingMallUserNotificationPreference> {
  // Retrieve existing preference by ID
  const existing =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findUnique(
      {
        where: { id: props.userNotificationPreferenceId },
      },
    );
  if (existing === null) {
    throw new HttpException("User notification preference not found", 404);
  }
  if (existing.administrator_id !== props.administrator.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    return await prisma.shopping_mall_user_notification_preferences.update({
      where: { id: props.userNotificationPreferenceId },
      data: props.body,
    });
  });
  // Return updated record
  return updated;
}
