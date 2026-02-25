import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_shopping_cart_item } from "../prepare/prepare_random_shopping_mall_shopping_cart_item";

export async function generate_random_shopping_mall_customer_carts_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallShoppingCartItem.ICreate>;
  },
): Promise<IShoppingMallShoppingCartItem> {
  const prepared: IShoppingMallShoppingCartItem.ICreate =
    prepare_random_shopping_mall_shopping_cart_item(props.body);
  const result: IShoppingMallShoppingCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      body: prepared,
    });
  return result;
}
