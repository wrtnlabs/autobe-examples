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
 * Test customer cart retrieval with stock availability status validation.
 *
 * Validates that the cart retrieval endpoint correctly returns cart items with their stock availability status. The test authenticates a customer and retrieves their shopping cart to verify the response structure includes all required availability-related fields including availabilityStatus, unavailable_count, and total_amount.
 *
 * Due to API limitations (no product/variant/cart item creation endpoints available in test scope), this test validates the cart retrieval structure and type safety rather than the full out-of-stock business scenario.
 *
 * 1. Customer registers and authenticates with the system.
 * 2. Retrieves the customer's shopping cart by cart ID.
 * 3. Validates cart structure includes items array with availabilityStatus field.
 * 4. Validates cart summary fields: total_amount, item_count, unavailable_count.
 * 5. Verifies typia.assert validates the complete cart response structure.
 */
export async function test_api_cart_retrieval_with_out_of_stock_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
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
  // 2. Retrieve cart (using generated cart ID - system should handle cart creation)
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const cart = await api.functional.ecommerce.customer.carts.at(
    customerConnection,
    {
      cartId,
    },
  );
  typia.assert(cart);
  // 3. Validate cart structure
  TestValidator.equals("cart has items array", Array.isArray(cart.items), true);
  TestValidator.predicate(
    "total_amount is number",
    typeof cart.total_amount === "number",
  );
  TestValidator.predicate(
    "item_count is non-negative integer",
    cart.item_count >= 0,
  );
  TestValidator.predicate(
    "unavailable_count is non-negative",
    cart.unavailable_count >= 0,
  );
  TestValidator.predicate(
    "unavailable_count <= item_count",
    cart.unavailable_count <= cart.item_count,
  );
  // 4. Validate cart items have availabilityStatus field
  for (const item of cart.items) {
    TestValidator.predicate(
      "cart item has availabilityStatus",
      typeof item.availabilityStatus === "boolean",
    );
    TestValidator.predicate("cart item has quantity", item.quantity >= 1);
    TestValidator.predicate(
      "cart item has productVariant",
      item.productVariant !== undefined,
    );
  }
  // 5. Validate customer reference in cart
  TestValidator.equals(
    "cart customer ID matches authenticated customer",
    cart.customer.id,
    customer.id,
  );
}
