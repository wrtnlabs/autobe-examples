import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_customer_cart_item } from "../prepare/prepare_random_shopping_mall_customer_cart_item";

/**
 * Generate a random shopping mall customer cart item for E2E testing.
 *
 * Prepares random cart item data using the prepare function, then calls the creation endpoint
 * to add a product variant to the customer's shopping cart. This simulates a customer adding
 * items to their cart with a specified quantity.
 *
 * The prepare function generates a random product variant ID and quantity, which can be
 * overridden by providing partial input. The API call creates or updates the cart item,
 * combining quantities if the same variant already exists in the cart.
 */
export async function generate_random_shopping_mall_customer_cart_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCustomerCartItem.ICreate> | undefined;
  },
): Promise<IShoppingMallCustomerCartItem> {
  const prepared: IShoppingMallCustomerCartItem.ICreate =
    prepare_random_shopping_mall_customer_cart_item(props.body);
  const result: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.cart.items.create(connection, {
      body: prepared,
    });
  return result;
}
