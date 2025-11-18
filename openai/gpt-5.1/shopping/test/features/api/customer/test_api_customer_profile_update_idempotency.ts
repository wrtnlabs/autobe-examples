import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";

/**
 * Validate idempotent behavior of customer profile update API.
 *
 * Business goal: Ensure that repeating the same PUT
 * /shoppingMall/customer/customers/{customerId}/profile request with an
 * identical IShoppingMallCustomerProfile.IUpdate payload:
 *
 * - Does not create duplicate profile records
 * - Keeps the profile content stable
 * - Maintains a consistent association with the owning customer
 *
 * Test steps:
 *
 * 1. Join a new customer (POST /auth/customer/join) to get an authorized customer
 *    context and customerId.
 * 2. Create a customer cart (POST /shoppingMall/customer/carts) to confirm the
 *    customer is usable in the shopping context (sanity check only).
 * 3. Construct a deterministic profile update payload
 *    (IShoppingMallCustomerProfile.IUpdate) with full_name, phone_number,
 *    locale, and time_zone.
 * 4. Call profile.update once with the payload and capture the response.
 * 5. Call profile.update again immediately with the same payload and capture the
 *    second response.
 * 6. Validate that:
 *
 *    - Both responses refer to the same profile id and same customer id.
 *    - The business profile fields are identical between the two responses.
 *    - No signs of duplicate profiles appear (same id, consistent content).
 */
export async function test_api_customer_profile_update_idempotency(
  connection: api.IConnection,
) {
  // 1. Join a new customer and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Sanity: Authorization header must now be present with an access token
  typia.assert<IAuthorizationToken>(authorized.token);

  // 2. Create a cart in the customer context to ensure customer-scoped APIs work
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  // 3. Prepare a deterministic profile update payload
  const profileUpdate = {
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    locale: "en-US",
    time_zone: "Asia/Seoul",
  } satisfies IShoppingMallCustomerProfile.IUpdate;

  // 4. First profile update call
  const firstProfile: IShoppingMallCustomerProfile =
    await api.functional.shoppingMall.customer.customers.profile.update(
      connection,
      {
        customerId: authorized.id,
        body: profileUpdate,
      },
    );
  typia.assert(firstProfile);

  // Basic invariants for the first update
  TestValidator.equals(
    "first profile customer id should match authorized customer",
    firstProfile.customer.id,
    authorized.id,
  );

  // 5. Second profile update call with identical payload (idempotency check)
  const secondProfile: IShoppingMallCustomerProfile =
    await api.functional.shoppingMall.customer.customers.profile.update(
      connection,
      {
        customerId: authorized.id,
        body: profileUpdate,
      },
    );
  typia.assert(secondProfile);

  // 6-1. The profile belongs to the same customer
  TestValidator.equals(
    "second profile customer id should still match authorized customer",
    secondProfile.customer.id,
    authorized.id,
  );

  // 6-2. Profile id must be stable across identical PUT operations
  TestValidator.equals(
    "profile id must be stable across repeated identical updates",
    firstProfile.id,
    secondProfile.id,
  );

  // 6-3. Business profile fields must remain identical
  TestValidator.equals(
    "full_name must remain the same across repeated identical updates",
    firstProfile.full_name,
    secondProfile.full_name,
  );
  TestValidator.equals(
    "phone_number must remain the same across repeated identical updates",
    firstProfile.phone_number,
    secondProfile.phone_number,
  );
  TestValidator.equals(
    "locale must remain the same across repeated identical updates",
    firstProfile.locale,
    secondProfile.locale,
  );
  TestValidator.equals(
    "time_zone must remain the same across repeated identical updates",
    firstProfile.time_zone,
    secondProfile.time_zone,
  );

  // 6-4. Customer summary in profile should remain consistent as well
  TestValidator.equals(
    "customer summary id stays consistent across repeated profile updates",
    firstProfile.customer.id,
    secondProfile.customer.id,
  );
}
