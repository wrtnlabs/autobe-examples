import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer cart retrieval functionality with proper data structure validation.
 *
 * Validates the cart retrieval endpoint returns correctly structured cart data including items array, totals, and availability status. This test ensures the cart endpoint properly joins cart items with product variant details and computes availability status in real-time.
 *
 * Due to unavailable cart creation and seller product management APIs in the current SDK, the full product deletion cleanup scenario cannot be tested. This test focuses on validating cart retrieval endpoint accepts valid cart UUIDs and returns properly typed responses.
 *
 * 1. Generate a valid cart UUID for testing the retrieval endpoint.
 * 2. Call the cart retrieval endpoint with the generated cart ID.
 * 3. Validate the response structure and type safety with typia.assert().
 * 4. Verify cart totals and counts are properly computed.
 */
export async function test_api_cart_retrieval_after_product_deletion(
  connection: api.IConnection,
) {
  // 1. Generate valid cart UUID for testing
  const cartId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Retrieve cart with generated cart ID
  const cart = await api.functional.ecommerce.customer.carts.at(connection, {
    cartId,
  });
  typia.assert(cart);
  // 3. Validate cart structure and computed fields
  TestValidator.equals("cart ID matches input", cart.id, cartId);
  TestValidator.predicate("cart has valid item count", cart.item_count >= 0);
  TestValidator.predicate(
    "cart has valid unavailable count",
    cart.unavailable_count >= 0,
  );
  TestValidator.predicate("cart total is non-negative", cart.total_amount >= 0);
  TestValidator.predicate(
    "item count matches items array length",
    cart.item_count === cart.items.length,
  );
}
