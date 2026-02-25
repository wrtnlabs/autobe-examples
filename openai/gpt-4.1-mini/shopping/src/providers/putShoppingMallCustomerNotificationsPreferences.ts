import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
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

export async function putShoppingMallCustomerNotificationsPreferences(props: {
  customer: CustomerPayload;
  body: IShoppingMallUserNotificationPreference.IUpdate;
}): Promise<void> {
  await MyGlobal.prisma.shopping_mall_user_notification_preferences.updateMany({
    where: {
      userId: props.customer.id,
      channelName: props.body.channelName,
      notificationType: props.body.notificationType,
    },
    data: {
      isEnabled: props.body.isEnabled,
    },
  });
}
