import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_cart_item } from "../prepare/prepare_random_ecommerce_cart_item";

/**
 * Generate a random cart item in a customer's shopping cart via the API for E2E testing.
 *
 * Prepares random cart item data using the prepare function, then calls the creation endpoint to add a product variant to the specified customer's cart.
 *
 * ## Parameters
 *
 * - `cartId` - The UUID of the customer's shopping cart (required URL parameter)
 * - `body` - Optional partial cart item data to override defaults
 *
 * ## Business Rules
 *
 * - The product variant must exist and have available stock
 * - If the variant already exists in the cart, quantity is incremented
 * - Out of stock variants cannot be added
 * - Cart must belong to the authenticated customer
 *
 * ## Usage
 *
 * ```typescript
 * // Generate with required cartId and random defaults
 * const cartItem = await generate_random_ecommerce_customer_carts_items_create(connection, {
 *   params: { cartId: "some-uuid" },
 * });
 *
 * // Override specific fields
 * const customCartItem = await generate_random_ecommerce_customer_carts_items_create(connection, {
 *   params: { cartId: "some-uuid" },
 *   body: { quantity: 5 },
 * });
 * ```
 */
export async function generate_random_ecommerce_customer_carts_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceCartItem.ICreate>;
    params: {
      cartId: string;
    };
  },
): Promise<IEcommerceCartItem> {
  const prepared: IEcommerceCartItem.ICreate =
    prepare_random_ecommerce_cart_item(props.body);
  const result: IEcommerceCartItem =
    await api.functional.ecommerce.customer.carts.items.create(connection, {
      cartId: props.params.cartId,
      body: prepared,
    });
  return result;
}
