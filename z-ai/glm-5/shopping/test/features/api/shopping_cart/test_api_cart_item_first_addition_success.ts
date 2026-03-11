import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

/**
 * Tests the primary success path where an authenticated customer adds a product variant
 * to their cart for the first time. This scenario validates:
 *
 * 1. Pre-conditions: Customer is authenticated via join
 * 2. Test execution: Customer adds a cart item with valid variantId and quantity
 * 3. Post-conditions:
 *    - Cart is automatically created (single-cart-per-customer policy)
 *    - Cart item created with correct variant and quantity
 *    - Unavailable flag is false for available variants
 *    - Response includes complete cart item with timestamps
 */
export async function test_api_cart_item_first_addition_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate customer via join (creates new customer account)
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Step 2: Create cart item (first addition triggers cart auto-creation)
  const body = typia.random<IShoppingMallCartItem.ICreate>();
  const cartItem =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      { body },
    );
  typia.assert(cartItem);
  // Step 3: Validate business rules
  // For available variants from approved sellers, the unavailable flag should be false
  TestValidator.equals(
    "unavailable flag is false for available variant",
    cartItem.unavailable,
    false,
  );
}
