import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test basic shopping cart creation for authenticated customers.
 *
 * Validates that customers can create new cart sessions with minimal required
 * information (customer session reference). Verifies system automatically sets
 * cart status to 'active', calculates expiration timestamps based on platform
 * configuration, and generates unique cart identifiers.
 */
export async function test_api_customer_cart_creation_basic(
  connection: api.IConnection,
) {
  // Step 1: Create customer account and establish authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shopping-mall.example.com/register",
      referrer: "https://shopping-mall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create shopping cart using the authenticated customer session
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_session_id: customer.id,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // Step 3: Validate business logic (NOT type validation - typia.assert handles that)
  TestValidator.equals("cart status should be active", cart.status, "active");
  TestValidator.equals(
    "cart should be linked to customer session",
    cart.shopping_mall_customer_session_id,
    customer.id,
  );
  TestValidator.predicate(
    "expiration timestamp should be in the future",
    new Date(cart.expires_at) > new Date(),
  );

  // Step 4: Verify optional fields are properly handled (business logic)
  TestValidator.equals(
    "applied coupon should be undefined by default",
    cart.applied_coupon_code,
    undefined,
  );
  TestValidator.equals(
    "shipping method should be undefined by default",
    cart.shipping_method,
    undefined,
  );
  TestValidator.equals(
    "estimated shipping cost should be undefined by default",
    cart.estimated_shipping_cost,
    undefined,
  );
  TestValidator.equals(
    "deleted timestamp should be undefined for active cart",
    cart.deleted_at,
    undefined,
  );
}
