import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallBroadcastNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBroadcastNotification";
import { prepare_random_shopping_mall_broadcast_notification } from "../prepare/prepare_random_shopping_mall_broadcast_notification";
export async function generate_random_shopping_mall_admin_notifications_broadcast_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallBroadcastNotification.ICreate> | undefined;
  },
): Promise<IShoppingMallBroadcastNotification> {
  const prepared: IShoppingMallBroadcastNotification.ICreate =
    prepare_random_shopping_mall_broadcast_notification(props.body);
  return await api.functional.shoppingMall.admin.notifications.broadcast.create(
    connection,
    {
      body: prepared,
    },
  );
}
