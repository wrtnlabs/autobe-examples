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
 * Test customer can view shopping cart summary with items and price calculations.
 *
 * Validates that authenticated customers can retrieve their shopping cart summary containing all cart items with product details, variant options, quantities, prices, subtotals, and total price calculation. Ensures the cart total is correctly computed by summing all item subtotals.
 *
 * The test covers cart summary retrieval with proper type validation, item structure verification, and price calculation accuracy. It validates that each cart item displays product variant information including SKU code, option values, and stock availability status.
 *
 * 1. Authenticate as customer using join endpoint.
 * 2. Retrieve cart summary via GET /ecommerce/customer/cart/summary.
 * 3. Validate response structure with typia.assert.
 * 4. If items exist, verify each item has productVariant, quantity, and price data.
 * 5. Validate total_price equals sum of all item subtotals (price × quantity).
 * 6. Verify stock availability status is present for each item.
 */
export async function test_api_cart_summary_view_with_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Retrieve cart summary
  const cartSummary =
    await api.functional.ecommerce.customer.cart.summary.at(customerConnection);
  typia.assert(cartSummary);
  // 3. Validate cart structure
  TestValidator.equals("cart has valid id", typeof cartSummary.id, "string");
  TestValidator.predicate(
    "total price is number",
    typeof cartSummary.total_price === "number",
  );
  // 4. Validate items array structure
  if (cartSummary.items.length > 0) {
    // Validate each cart item has required fields
    for (const item of cartSummary.items) {
      // Validate productVariant exists and has required fields
      TestValidator.equals(
        "variant has sku_code",
        typeof item.productVariant.sku_code,
        "string",
      );
      TestValidator.equals(
        "variant has option_values",
        typeof item.productVariant.option_values,
        "string",
      );
      TestValidator.predicate(
        "variant has valid stock_count",
        item.productVariant.stock_count >= 0,
      );
      // Validate product reference exists
      TestValidator.equals(
        "product has name",
        typeof item.productVariant.product.name,
        "string",
      );
      // Validate quantity is positive
      TestValidator.predicate("quantity is positive", item.quantity > 0);
    }
    // 5. Validate total price calculation
    const calculatedTotal = cartSummary.items.reduce((sum, item) => {
      const unitPrice =
        item.productVariant.price ?? item.productVariant.product.base_price;
      return sum + unitPrice * item.quantity;
    }, 0);
    TestValidator.equals(
      "cart total equals sum of item subtotals",
      cartSummary.total_price,
      calculatedTotal,
    );
  } else {
    // Empty cart validation
    TestValidator.equals(
      "empty cart has zero total",
      cartSummary.total_price,
      0,
    );
  }
}
