import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_inventory_history } from "../prepare/prepare_random_shopping_mall_inventory_history";

export async function generate_random_shopping_mall_seller_products_variants_inventory_create_inventory_history(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallInventoryHistory.ICreate> | undefined;
    params: {
      productId: string;
      variantId: string;
    };
  },
): Promise<IShoppingMallInventoryHistory> {
  const prepared: IShoppingMallInventoryHistory.ICreate =
    prepare_random_shopping_mall_inventory_history(props.body);
  const result: IShoppingMallInventoryHistory =
    await api.functional.shoppingMall.seller.products.variants.inventory.createInventoryHistory(
      connection,
      {
        productId: props.params.productId,
        variantId: props.params.variantId,
        body: prepared,
      },
    );
  return result;
}
