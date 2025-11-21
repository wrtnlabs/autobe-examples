import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test that customers can retrieve their active shopping cart details including
 * status, expiration timestamp, applied coupons, and shipping preferences.
 * Validates that cart information is accurately presented to customers during
 * active shopping sessions.
 */
export async function test_api_cart_retrieval_active_session(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "testPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Validate customer authorization token structure
  TestValidator.equals(
    "customer has valid token structure",
    typeof customer.token.access,
    "string",
  );
  TestValidator.equals(
    "customer has valid refresh token",
    typeof customer.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "token expiration is valid",
    new Date(customer.token.expired_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "refresh token expiration is valid",
    new Date(customer.token.refreshable_until).toString() !== "Invalid Date",
  );

  // Step 2: Create shopping cart session with specific configuration
  const cartData = {
    shopping_mall_customer_session_id: customer.id,
    shipping_method: "express",
    applied_coupon_code: "SUMMER25",
  } satisfies IShoppingMallCart.ICreate;

  const createdCart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: cartData,
    },
  );
  typia.assert(createdCart);

  // Step 3: Retrieve cart details
  const retrievedCart = await api.functional.shoppingMall.customer.carts.at(
    connection,
    {
      cartId: createdCart.id,
    },
  );
  typia.assert(retrievedCart);

  // Step 4: Comprehensive cart details validation
  TestValidator.equals("cart ID matches", retrievedCart.id, createdCart.id);
  TestValidator.equals(
    "customer session ID matches",
    retrievedCart.shopping_mall_customer_session_id,
    customer.id,
  );
  TestValidator.equals("cart status is active", retrievedCart.status, "active");
  TestValidator.equals(
    "shipping method matches",
    retrievedCart.shipping_method,
    "express",
  );
  TestValidator.equals(
    "applied coupon matches",
    retrievedCart.applied_coupon_code,
    "SUMMER25",
  );

  // Validate expiration timestamp is properly calculated (within reasonable future range)
  const expirationDate = new Date(retrievedCart.expires_at);
  const now = new Date();
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await TestValidator.predicate(
    "cart expiration is in the future",
    expirationDate > now,
  );
  await TestValidator.predicate(
    "cart expiration is within reasonable timeframe",
    expirationDate >= oneDayFromNow && expirationDate <= oneWeekFromNow,
  );

  // Validate timestamps are properly set
  await TestValidator.predicate(
    "created_at timestamp is valid",
    new Date(retrievedCart.created_at).toString() !== "Invalid Date",
  );
  await TestValidator.predicate(
    "updated_at timestamp is valid",
    new Date(retrievedCart.updated_at).toString() !== "Invalid Date",
  );

  // Validate that created_at is before updated_at (should be equal for new carts)
  const createdAt = new Date(retrievedCart.created_at);
  const updatedAt = new Date(retrievedCart.updated_at);
  await TestValidator.predicate(
    "created_at is not after updated_at",
    createdAt <= updatedAt,
  );

  // Validate estimated_shipping_cost is properly handled (optional field)
  if (retrievedCart.estimated_shipping_cost !== undefined) {
    await TestValidator.predicate(
      "estimated shipping cost is a number",
      typeof retrievedCart.estimated_shipping_cost === "number",
    );
    await TestValidator.predicate(
      "estimated shipping cost is non-negative",
      retrievedCart.estimated_shipping_cost >= 0,
    );
  }

  // Validate deleted_at is undefined for active carts
  TestValidator.equals(
    "deleted_at is undefined for active cart",
    retrievedCart.deleted_at,
    undefined,
  );
}
