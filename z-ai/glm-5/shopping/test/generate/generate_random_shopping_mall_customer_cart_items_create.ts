import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_cart_item } from "../prepare/prepare_random_shopping_mall_cart_item";

export async function generate_random_shopping_mall_customer_cart_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCartItem.ICreate>;
  }
): Promise<IShoppingMallCartItem> {
  const prepared: IShoppingMallCartItem.ICreate = prepare_random_shopping_mall_cart_item(
    props.body
  );
  const result: IShoppingMallCartItem = await api.functional.shoppingMall.customer.cart.items.create(
    connection,
    {
      body: prepared,
    },
  );
  return result;
}