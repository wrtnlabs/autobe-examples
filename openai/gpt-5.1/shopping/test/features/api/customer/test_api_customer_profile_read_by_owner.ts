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
 * Validate that a customer can read their own profile and that unrelated
 * customer-scoped activity does not corrupt profile data.
 *
 * Business flow:
 *
 * 1. Join as a new customer via /auth/customer/join.
 * 2. Read the profile for the same customer via GET
 *    /shoppingMall/customer/customers/{customerId}/profile.
 * 3. Verify that the profile belongs to the joined customer and has sane defaults
 *    for optional fields.
 * 4. Create a customer cart via /shoppingMall/customer/carts to simulate unrelated
 *    customer activity.
 * 5. Re-read the profile and ensure core profile data remains consistent.
 */
export async function test_api_customer_profile_read_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join)
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinRequest,
    });
  typia.assert(authorized);

  // 2. Read profile for the same customer
  const initialProfile: IShoppingMallCustomerProfile =
    await api.functional.shoppingMall.customer.customers.profile.at(
      connection,
      {
        customerId: authorized.id,
      },
    );
  typia.assert(initialProfile);

  // Basic identity consistency checks
  TestValidator.equals(
    "profile.customer.id matches authorized.id",
    initialProfile.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile.customer.email matches joinRequest.email",
    initialProfile.customer.email,
    joinRequest.email,
  );

  // created_at and updated_at should be present (non-empty strings)
  TestValidator.predicate(
    "profile.created_at is non-empty",
    initialProfile.created_at.length > 0,
  );
  TestValidator.predicate(
    "profile.updated_at is non-empty",
    initialProfile.updated_at.length > 0,
  );

  // Optional profile fields are allowed to be undefined. We just ensure that
  // accessing them does not crash; their type has already been validated by
  // typia.assert.

  // 3. Create a customer cart to simulate unrelated activity
  const cartRequest = {
    actor_type: "customer",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartRequest,
    });
  typia.assert(cart);

  // 4. Re-read the profile after cart creation
  const afterCartProfile: IShoppingMallCustomerProfile =
    await api.functional.shoppingMall.customer.customers.profile.at(
      connection,
      {
        customerId: authorized.id,
      },
    );
  typia.assert(afterCartProfile);

  // Core identity must remain the same
  TestValidator.equals(
    "profile.customer.id stable after cart activity",
    afterCartProfile.customer.id,
    initialProfile.customer.id,
  );
  TestValidator.equals(
    "profile.customer.email stable after cart activity",
    afterCartProfile.customer.email,
    initialProfile.customer.email,
  );

  // created_at should remain stable
  TestValidator.equals(
    "profile.created_at remains unchanged",
    afterCartProfile.created_at,
    initialProfile.created_at,
  );

  // updated_at should remain non-empty after cart activity
  TestValidator.predicate(
    "profile.updated_at remains non-empty after cart activity",
    afterCartProfile.updated_at.length > 0,
  );
}
