import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallUserNotificationPreferenceCollector } from "../collectors/ShoppingMallUserNotificationPreferenceCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallUserNotificationPreferenceTransformer } from "../transformers/ShoppingMallUserNotificationPreferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorUserNotificationPreferences(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallUserNotificationPreference.ICreate;
}): Promise<IShoppingMallUserNotificationPreference> {
  const data = await ShoppingMallUserNotificationPreferenceCollector.collect({
    body: props.body,
  });
  const created =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.create({
      data,
      ...ShoppingMallUserNotificationPreferenceTransformer.select(),
    });
  return await ShoppingMallUserNotificationPreferenceTransformer.transform(
    created,
  );
}
