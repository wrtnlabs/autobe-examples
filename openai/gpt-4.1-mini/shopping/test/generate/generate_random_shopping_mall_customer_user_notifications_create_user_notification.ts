import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_user_notification } from "../prepare/prepare_random_shopping_mall_user_notification";

export async function generate_random_shopping_mall_customer_user_notifications_create_user_notification(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallUserNotification.ICreate> | undefined;
  },
): Promise<IShoppingMallUserNotification> {
  const prepared: IShoppingMallUserNotification.ICreate =
    prepare_random_shopping_mall_user_notification(props.body);
  const result: IShoppingMallUserNotification =
    await api.functional.shoppingMall.customer.userNotifications.createUserNotification(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
