import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_user_notification_preference } from "../prepare/prepare_random_shopping_mall_user_notification_preference";

/**
 * Generates a random shopping mall user notification preference resource by calling the createUserNotificationPreference API.
 * @param connection API connection interface
 * @param props Optional props containing partial create data
 * @returns Created or updated IShoppingMallUserNotificationPreference resource
 */
export async function generate_random_shopping_mall_administrator_user_notification_preferences_create_user_notification_preference(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallUserNotificationPreference.ICreate>;
  },
): Promise<IShoppingMallUserNotificationPreference> {
  const prepared: IShoppingMallUserNotificationPreference.ICreate =
    prepare_random_shopping_mall_user_notification_preference(props.body);
  const result: IShoppingMallUserNotificationPreference =
    await api.functional.shoppingMall.administrator.userNotificationPreferences.createUserNotificationPreference(
      connection,
      { body: prepared },
    );
  return result;
}
