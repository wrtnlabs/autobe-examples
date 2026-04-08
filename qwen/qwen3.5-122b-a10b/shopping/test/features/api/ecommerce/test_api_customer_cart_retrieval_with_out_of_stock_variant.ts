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
 * Test customer cart retrieval with out-of-stock variant availability validation.
 *
 * Validates that the cart retrieval endpoint correctly handles stock validation and availability checking when enabled. This test ensures the cart structure includes proper availability flags, stock status information, and accurate count calculations for unavailable items.
 *
 * The test verifies cart retrieval with validation flags enabled, confirming that the response includes all required fields for availability tracking. While the full out-of-stock scenario requires product/variant creation and cart item addition (not available in current SDK), this test validates the cart retrieval infrastructure and response structure.
 *
 * 1. Customer registers and authenticates via join operation.
 * 2. Cart is retrieved with stock and availability validation enabled.
 * 3. Validates cart structure includes all required fields.
 * 4. Confirms empty cart has zero counts and zero total.
 * 5. Validates response type safety with typia.assert().
 */
export async function test_api_customer_cart_retrieval_with_out_of_stock_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Retrieve cart with stock and availability validation enabled
  const cart = await api.functional.ecommerce.customer.carts.search(
    customerConnection,
    {
      body: {
        validate_stock: true,
        validate_availability: true,
        include_details: true,
      } satisfies IEcommerceCart.IRequest,
    },
  );
  typia.assert(cart);
  // 3. Validate cart structure for empty cart
  TestValidator.equals(
    "cart has customer reference",
    cart.customer !== null,
    true,
  );
  TestValidator.equals("initial item count", cart.item_count, 0);
  TestValidator.equals("initial unavailable count", cart.unavailable_count, 0);
  TestValidator.equals("initial total amount", cart.total_amount, 0);
  TestValidator.equals("items array is empty", cart.items.length, 0);
  // 4. Validate customer reference fields
  TestValidator.equals("customer id matches", cart.customer.id, customer.id);
  TestValidator.predicate(
    "customer has display name",
    cart.customer.display_name.length > 0,
  );
  // 5. Validate cart timestamps
  TestValidator.predicate("cart has created_at", cart.created_at !== null);
  TestValidator.predicate("cart has updated_at", cart.updated_at !== null);
  // Note: Full out-of-stock variant scenario requires:
  // - Product/variant creation (seller/admin operations not in SDK)
  // - Cart item addition (not available in SDK)
  // - Inventory modification (not available in SDK)
  //
  // This test validates the cart retrieval infrastructure and response structure.
  // When items are added to cart in a complete implementation, the validation
  // flags (validate_stock, validate_availability) will ensure:
  // - Out-of-stock items show availabilityStatus = false
  // - Unavailable items remain in cart (not removed)
  // - total_amount excludes unavailable items
  // - unavailable_count includes out-of-stock items
}
