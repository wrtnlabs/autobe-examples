import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationDelivery";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_notification_delivery } from "../prepare/prepare_random_shopping_mall_notification_delivery";

export async function generate_random_shopping_mall_administrator_notification_deliveries_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallNotificationDelivery.ICreate> | undefined;
  },
): Promise<IShoppingMallNotificationDelivery> {
  const prepared: IShoppingMallNotificationDelivery.ICreate =
    prepare_random_shopping_mall_notification_delivery(props.body);
  const result: IShoppingMallNotificationDelivery =
    await api.functional.shoppingMall.administrator.notificationDeliveries.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
