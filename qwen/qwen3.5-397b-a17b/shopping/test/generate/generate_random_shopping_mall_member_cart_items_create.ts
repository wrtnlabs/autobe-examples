import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_cart_item } from "../prepare/prepare_random_shopping_mall_cart_item";

/**
 * Generate a random shopping mall cart item via the API for E2E testing.
 *
 * Prepares random cart item data using the prepare function with a product variant
 * ID and quantity, then calls the cart item creation endpoint to add the item to
 * the authenticated customer's shopping cart. The cart is automatically determined
 * from the member's session.
 *
 * This function supports test customization through the optional body parameter,
 * allowing tests to override specific values like product_variant_id or quantity
 * while using random generation for unspecified properties.
 *
 * @param connection - The API connection with authentication headers
 * @param props - Optional configuration with body overrides
 * @param props.body - Partial cart item creation data to override random generation
 * @returns The created or updated cart item with final quantity
 */
export async function generate_random_shopping_mall_member_cart_items_create(
  connection: IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCartItem.ICreate>;
  },
): Promise<IShoppingMallCartItem> {
  const prepared: IShoppingMallCartItem.ICreate =
    prepare_random_shopping_mall_cart_item(props.body);
  const result: IShoppingMallCartItem =
    await api.functional.shoppingMall.member.cart.items.create(connection, {
      body: prepared,
    });
  return result;
}
