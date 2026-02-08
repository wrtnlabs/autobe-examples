import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
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

export async function getShoppingMallAdministratorUserNotificationsUserNotificationId(props: {
  administrator: AdministratorPayload;
  userNotificationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallUserNotification> {
  const record =
    await MyGlobal.prisma.shopping_mall_user_notifications.findUnique({
      where: { id: props.userNotificationId },
    });
  if (!record) {
    throw new HttpException("Notification not found", 404);
  }
  return record;
}
