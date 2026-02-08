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

export async function deleteShoppingMallAdministratorUserNotificationsUserNotificationId(props: {
  administrator: AdministratorPayload;
  userNotificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const notification =
    await MyGlobal.prisma.shopping_mall_user_notifications.findUnique({
      where: { id: props.userNotificationId },
    });
  if (notification === null) {
    throw new HttpException("User notification not found", 404);
  }
  // Since the administrator is authorized, proceed with deletion
  await MyGlobal.prisma.shopping_mall_user_notifications.delete({
    where: { id: props.userNotificationId },
  });
}
