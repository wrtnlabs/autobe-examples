import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallUserNotificationTransformer } from "../transformers/ShoppingMallUserNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorUserNotificationsNotificationId(props: {
  administrator: AdministratorPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallUserNotification> {
  const record =
    await MyGlobal.prisma.shopping_mall_user_notifications.findUniqueOrThrow({
      where: { id: props.notificationId },
      ...ShoppingMallUserNotificationTransformer.select(),
    });
  if (
    record.owner_id !== props.administrator.id ||
    record.owner_type !== "administrator"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (record.deleted_at !== null) {
    throw new HttpException("Notification has been deleted", 404);
  }
  return await ShoppingMallUserNotificationTransformer.transform(record);
}
