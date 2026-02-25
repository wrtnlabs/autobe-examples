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
import { ShoppingMallUserNotificationPreferenceTransformer } from "../transformers/ShoppingMallUserNotificationPreferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerUserNotificationPreferencesPreferenceId(props: {
  customer: CustomerPayload;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallUserNotificationPreference> {
  const preference =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findUniqueOrThrow(
      {
        where: { id: props.preferenceId },
        ...ShoppingMallUserNotificationPreferenceTransformer.select(),
      },
    );
  if (preference.customer?.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return ShoppingMallUserNotificationPreferenceTransformer.transform(
    preference,
  );
}
