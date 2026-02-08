import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_sale_snapshot } from "../prepare/prepare_random_shopping_mall_sale_snapshot";

export async function generate_random_shopping_mall_seller_sale_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSaleSnapshot.ICreate>;
  },
): Promise<IShoppingMallSaleSnapshot> {
  const prepared: IShoppingMallSaleSnapshot.ICreate =
    prepare_random_shopping_mall_sale_snapshot(props.body);
  const result: IShoppingMallSaleSnapshot =
    await api.functional.shoppingMall.seller.sale_snapshots.create(connection, {
      body: prepared,
    });
  return result;
}
