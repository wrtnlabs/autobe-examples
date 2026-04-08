import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_cart } from "../prepare/prepare_random_ecommerce_mall_cart";

/**
 * Generate a random shopping cart item by adding a product variant to the authenticated customer's cart for E2E testing.
 *
 * Prepares random cart creation data using the prepare function, then calls the cart creation endpoint. The system automatically creates a shopping cart when the customer adds their first item. If the specified variant already exists in the cart, the quantities are combined.
 *
 * This function is used for E2E testing scenarios that involve shopping cart operations such as:
 * - Adding products to cart
 * - Testing quantity combination behavior
 * - Verifying cart item creation with variant details
 *
 * @param connection - API connection configuration
 * @param props - Optional body overrides for specific test scenarios
 * @returns Promise resolving to the created/updated cart item with variant details
 */
export async function generate_random_ecommerce_mall_customer_customers_me_cart_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallCart.ICreate>;
  },
): Promise<IEcommerceMallCartItem> {
  const prepared: IEcommerceMallCart.ICreate =
    prepare_random_ecommerce_mall_cart(props.body);
  const result: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.customers.me.cart.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
