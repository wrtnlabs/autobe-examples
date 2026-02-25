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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallUserNotificationPreferenceTransformer } from "../transformers/ShoppingMallUserNotificationPreferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerUserNotificationPreferences(props: {
  seller: SellerPayload;
  body: IShoppingMallUserNotificationPreference.ICreate;
}): Promise<IShoppingMallUserNotificationPreference> {
  const data = await ShoppingMallUserNotificationPreferenceCollector.collect({
    body: {
      ...props.body,
      sellerId: props.seller.id,
    },
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
