import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_order_item_snapshot } from "../prepare/prepare_random_shopping_mall_order_item_snapshot";

export async function generate_random_shopping_mall_order_item_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallOrderItemSnapshot.ICreate> | undefined;
  },
): Promise<IShoppingMallOrderItemSnapshot> {
  const prepared: IShoppingMallOrderItemSnapshot.ICreate =
    prepare_random_shopping_mall_order_item_snapshot(props.body);
  const result: IShoppingMallOrderItemSnapshot =
    await api.functional.shoppingMall.orderItemSnapshots.create(connection, {
      body: prepared,
    });
  return result;
}
