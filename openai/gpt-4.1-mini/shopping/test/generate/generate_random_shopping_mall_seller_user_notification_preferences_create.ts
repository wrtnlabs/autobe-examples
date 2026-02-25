import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_user_notification_preference } from "../prepare/prepare_random_shopping_mall_user_notification_preference";

export async function generate_random_shopping_mall_seller_user_notification_preferences_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallUserNotificationPreference.ICreate>;
  },
): Promise<IShoppingMallUserNotificationPreference> {
  const prepared: IShoppingMallUserNotificationPreference.ICreate =
    prepare_random_shopping_mall_user_notification_preference(props.body);
  return await api.functional.shoppingMall.seller.userNotificationPreferences.create(
    connection,
    {
      body: prepared,
    },
  );
}
