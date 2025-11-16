import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";

/**
 * Validate that a newly created persistent customer cart can be linked to an
 * existing guest cart using source_guest_token.
 *
 * Business context:
 *
 * - Guests can build a cart before authentication; the platform stores this state
 *   in shopping_mall_guest_carts using a guest_token.
 * - After the user joins as a customer, a persistent cart in
 *   shopping_mall_customer_carts should be able to remember which guest session
 *   it originated from via source_guest_token, for analytics and conversion
 *   tracking.
 *
 * Test steps:
 *
 * 1. Create a guest cart with a concrete guest_token and optional context fields.
 * 2. Register (join) a new customer, which also authenticates and sets
 *    Authorization header automatically via SDK.
 * 3. Create a customer cart with IShoppingMallCustomerCart.ICreate, wiring
 *    source_guest_token to the guest_token created in step 1.
 * 4. Validate that the created cart:
 *
 *    - Has source_guest_token preserved exactly.
 *    - Belongs to the authenticated customer (cart.customer.id equals
 *         authorized.customer.id from join).
 *    - Respects explicit configuration flags/fields such as is_active, currency_code
 *         and region_code.
 */
export async function test_api_customer_cart_creation_with_guest_cart_migration_token(
  connection: api.IConnection,
) {
  // 1. Create guest cart with specific guest_token
  const guestToken: string = RandomGenerator.alphaNumeric(32);

  const guestCartCreateBody = {
    guest_token: guestToken,
    ip: "203.0.113.10",
    user_agent: "Mozilla/5.0 (E2E Test Guest Cart)",
    referrer: typia.random<string & tags.Format<"uri">>(),
    region_code: "US",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartCreateBody,
    });
  typia.assert(guestCart);

  // Sanity: guest_token round-trip check
  TestValidator.equals(
    "guest cart should preserve guest_token",
    guestCart.guest_token,
    guestToken,
  );

  // 2. Register and authenticate customer via /auth/customer/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 3. Create customer cart linked to the guest cart via source_guest_token
  const currencyCode = "USD";
  const regionCode = "US";
  const isActive = true;

  const customerCartCreateBody = {
    currency_code: currencyCode,
    region_code: regionCode,
    channel: "web",
    metadata: {
      campaign: "guest-to-customer-e2e",
      test_run_id: RandomGenerator.alphaNumeric(10),
    },
    is_active: isActive,
    source_guest_token: guestCart.guest_token,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerCartCreateBody,
      },
    );
  typia.assert(customerCart);

  // 4. Business validations
  // 4-1. The cart must belong to the authenticated customer
  TestValidator.equals(
    "customer cart owner should match authorized customer",
    customerCart.customer.id,
    authorized.customer.id,
  );

  // 4-2. source_guest_token must be preserved
  TestValidator.equals(
    "customer cart should store source_guest_token linking back to guest cart",
    customerCart.source_guest_token,
    guestCart.guest_token,
  );

  // 4-3. Configuration flags should be respected
  TestValidator.equals(
    "customer cart is_active flag should match request",
    customerCart.is_active,
    isActive,
  );
  TestValidator.equals(
    "customer cart currency_code should match request",
    customerCart.currency_code,
    currencyCode,
  );
  TestValidator.equals(
    "customer cart region_code should match request",
    customerCart.region_code,
    regionCode,
  );
}
