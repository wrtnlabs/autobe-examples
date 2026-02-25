import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_inventory_history } from "../prepare/prepare_random_shopping_mall_inventory_history";

export async function generate_random_shopping_mall_seller_inventory_add_add_inventory(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallInventoryHistory.ICreate> | undefined;
    params: {
      variantId: string;
    };
  },
): Promise<IShoppingMallInventoryHistory> {
  const prepared: IShoppingMallInventoryHistory.ICreate =
    prepare_random_shopping_mall_inventory_history(props.body);
  return await api.functional.shoppingMall.seller.inventory.add.addInventory(
    connection,
    {
      body: prepared,
      variantId: props.params.variantId,
    },
  );
}
