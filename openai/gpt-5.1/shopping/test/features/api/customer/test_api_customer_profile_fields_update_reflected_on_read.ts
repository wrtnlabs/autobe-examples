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

export async function test_api_customer_profile_fields_update_reflected_on_read(
  connection: api.IConnection,
) {
  // 1. Register a new customer via auth.customer.join
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!", // satisfies password format in practice
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://ads.example.com/campaign",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedCustomer);

  const customerId = authorizedCustomer.id;

  // 2. Create a customer-scoped cart to exercise context
  const cartCreateBody = {
    actor_type: "customer",
    status: undefined,
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  // 3. Read initial profile
  const initialProfile: IShoppingMallCustomerProfile =
    await api.functional.shoppingMall.customer.customers.profile.at(
      connection,
      { customerId },
    );
  typia.assert(initialProfile);

  // Sanity checks on initial profile/customer linkage
  TestValidator.equals(
    "profile.customer.id matches authenticated customer id",
    initialProfile.customer.id,
    customerId,
  );

  // Capture original immutable-ish fields
  const originalProfileId = initialProfile.id;
  const originalCreatedAt = initialProfile.created_at;
  const originalUpdatedAt = initialProfile.updated_at;

  // 4. First update payload with all mutable fields
  const firstUpdateBody = {
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    locale: "en-US",
    time_zone: "Asia/Seoul",
  } satisfies IShoppingMallCustomerProfile.IUpdate;

  const firstUpdatedProfile: IShoppingMallCustomerProfile =
    await api.functional.shoppingMall.customer.customers.profile.update(
      connection,
      {
        customerId,
        body: firstUpdateBody,
      },
    );
  typia.assert(firstUpdatedProfile);

  // 5. Validate first update
  TestValidator.equals(
    "profile id unchanged after first update",
    firstUpdatedProfile.id,
    originalProfileId,
  );
  TestValidator.equals(
    "customer summary id unchanged after first update",
    firstUpdatedProfile.customer.id,
    initialProfile.customer.id,
  );
  TestValidator.equals(
    "full_name updated correctly in first update",
    firstUpdatedProfile.full_name,
    firstUpdateBody.full_name,
  );
  TestValidator.equals(
    "phone_number updated correctly in first update",
    firstUpdatedProfile.phone_number,
    firstUpdateBody.phone_number,
  );
  TestValidator.equals(
    "locale updated correctly in first update",
    firstUpdatedProfile.locale,
    firstUpdateBody.locale,
  );
  TestValidator.equals(
    "time_zone updated correctly in first update",
    firstUpdatedProfile.time_zone,
    firstUpdateBody.time_zone,
  );
  TestValidator.equals(
    "created_at unchanged after first update",
    firstUpdatedProfile.created_at,
    originalCreatedAt,
  );

  const initialUpdatedAtDate = new Date(originalUpdatedAt);
  const firstUpdatedAtDate = new Date(firstUpdatedProfile.updated_at);
  TestValidator.predicate(
    "updated_at should be same or after original after first update",
    firstUpdatedAtDate.getTime() >= initialUpdatedAtDate.getTime(),
  );

  // 6. Re-read profile and compare with first update response
  const firstReloadedProfile: IShoppingMallCustomerProfile =
    await api.functional.shoppingMall.customer.customers.profile.at(
      connection,
      { customerId },
    );
  typia.assert(firstReloadedProfile);

  TestValidator.equals(
    "profile after first reload should equal firstUpdatedProfile",
    firstReloadedProfile,
    firstUpdatedProfile,
  );

  // 7. Second update: partial update (change some fields only)
  const secondUpdateBody = {
    full_name: RandomGenerator.name(),
    time_zone: "America/Los_Angeles",
  } satisfies IShoppingMallCustomerProfile.IUpdate;

  const secondUpdatedProfile: IShoppingMallCustomerProfile =
    await api.functional.shoppingMall.customer.customers.profile.update(
      connection,
      {
        customerId,
        body: secondUpdateBody,
      },
    );
  typia.assert(secondUpdatedProfile);

  // 8. Validate second update semantics
  TestValidator.equals(
    "profile id unchanged after second update",
    secondUpdatedProfile.id,
    originalProfileId,
  );
  TestValidator.equals(
    "customer summary id unchanged after second update",
    secondUpdatedProfile.customer.id,
    initialProfile.customer.id,
  );
  TestValidator.equals(
    "created_at unchanged after second update",
    secondUpdatedProfile.created_at,
    originalCreatedAt,
  );

  // updated_at must move forward again
  const secondUpdatedAtDate = new Date(secondUpdatedProfile.updated_at);
  TestValidator.predicate(
    "updated_at should be after first update timestamp",
    secondUpdatedAtDate.getTime() >= firstUpdatedAtDate.getTime(),
  );

  // Changed fields reflect new values
  TestValidator.equals(
    "full_name updated correctly in second update",
    secondUpdatedProfile.full_name,
    secondUpdateBody.full_name,
  );
  TestValidator.equals(
    "time_zone updated correctly in second update",
    secondUpdatedProfile.time_zone,
    secondUpdateBody.time_zone,
  );

  // Fields omitted from second update should retain first update values
  TestValidator.equals(
    "phone_number preserved when omitted in second update",
    secondUpdatedProfile.phone_number,
    firstUpdatedProfile.phone_number,
  );
  TestValidator.equals(
    "locale preserved when omitted in second update",
    secondUpdatedProfile.locale,
    firstUpdatedProfile.locale,
  );

  // 9. Final read and equality check with second update
  const secondReloadedProfile: IShoppingMallCustomerProfile =
    await api.functional.shoppingMall.customer.customers.profile.at(
      connection,
      { customerId },
    );
  typia.assert(secondReloadedProfile);

  TestValidator.equals(
    "profile after second reload should equal secondUpdatedProfile",
    secondReloadedProfile,
    secondUpdatedProfile,
  );
}
