import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_cart_item } from "../prepare/prepare_random_shopping_mall_cart_item";

/**
 * Generate a random cart item for the authenticated customer via the API for E2E testing.
 *
 * Prepares random cart item creation data using the prepare function, then calls the cart item
 * creation endpoint. When the same product variant already exists in the customer's cart, the
 * quantities are combined rather than creating a duplicate entry.
 *
 * The returned cart item includes full product variant details — SKU code, option values,
 * effective price, stock quantity, and a computed availability flag — allowing test scenarios
 * to immediately verify the cart state without additional API calls.
 */
export async function generate_random_shopping_mall_customer_cart_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCartItem.ICreate> | undefined;
  }
): Promise<IShoppingMallCartItem> {
  const prepared: IShoppingMallCartItem.ICreate = prepare_random_shopping_mall_cart_item(
    props.body
  );
  const result: IShoppingMallCartItem = await api.functional.shoppingMall.customer.cart_items.create(
    connection,
    {
      body: prepared,
    },
  );
  return result;
}