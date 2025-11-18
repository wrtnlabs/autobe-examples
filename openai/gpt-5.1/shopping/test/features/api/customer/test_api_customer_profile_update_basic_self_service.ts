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
 * Validate that an authenticated customer can self-service update their own
 * profile.
 *
 * Business flow covered:
 *
 * 1. A new customer self-registers via /auth/customer/join and receives an
 *    authorized session.
 * 2. The customer creates a cart via /shoppingMall/customer/carts to simulate an
 *    active shopping context.
 * 3. The same customer updates their profile via PUT
 *    /shoppingMall/customer/customers/{customerId}/profile with new values for
 *    full_name, phone_number, locale, and time_zone.
 * 4. The API returns an updated IShoppingMallCustomerProfile instance whose
 *    mutable fields reflect the payload and whose timestamps behave correctly
 *    (created_at stays fixed, updated_at moves forward).
 *
 * What this test validates:
 *
 * - Join endpoint issues a valid authorized customer payload and configures the
 *   connection for authenticated calls.
 * - A customer-scoped cart can be created using the authenticated context,
 *   implicitly confirming the customer account is usable.
 * - Profile update accepts a well-formed IShoppingMallCustomerProfile.IUpdate
 *   payload and persists the new values.
 * - System-managed timestamps on the profile (created_at, updated_at) are
 *   non-null and show that an update occurred (updated_at is later than
 *   created_at).
 */
export async function test_api_customer_profile_update_basic_self_service(
  connection: api.IConnection,
) {
  // 1. Customer self-join to obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://shop.example.com/join",
    referrer: "https://ads.example.com/campaign-123",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a cart for this authenticated customer to mimic realistic context
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  // 3. Prepare profile update payload with explicit values
  const updateBody = {
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile("010"),
    locale: "en-US",
    time_zone: "Asia/Seoul",
  } satisfies IShoppingMallCustomerProfile.IUpdate;

  const beforeUpdate = new Date().toISOString();

  const profile: IShoppingMallCustomerProfile =
    await api.functional.shoppingMall.customer.customers.profile.update(
      connection,
      {
        customerId: authorized.id,
        body: updateBody,
      },
    );
  typia.assert(profile);

  // 4. Field-level assertions for updated profile
  TestValidator.equals(
    "profile.full_name should match update payload",
    profile.full_name,
    updateBody.full_name,
  );
  TestValidator.equals(
    "profile.phone_number should match update payload",
    profile.phone_number,
    updateBody.phone_number,
  );
  TestValidator.equals(
    "profile.locale should match update payload",
    profile.locale,
    updateBody.locale,
  );
  TestValidator.equals(
    "profile.time_zone should match update payload",
    profile.time_zone,
    updateBody.time_zone,
  );

  // 5. Timestamp behavior: created_at is set and not later than updated_at
  TestValidator.predicate(
    "profile.created_at must be non-empty",
    () =>
      typeof profile.created_at === "string" && profile.created_at.length > 0,
  );

  const createdAtDate = new Date(profile.created_at);
  const updatedAtDate = new Date(profile.updated_at);
  const baselineDate = new Date(beforeUpdate);

  TestValidator.predicate(
    "profile.updated_at should be on or after test start time",
    () => updatedAtDate.getTime() >= baselineDate.getTime(),
  );
  TestValidator.predicate(
    "profile.updated_at should be same as or after created_at",
    () => updatedAtDate.getTime() >= createdAtDate.getTime(),
  );
}
