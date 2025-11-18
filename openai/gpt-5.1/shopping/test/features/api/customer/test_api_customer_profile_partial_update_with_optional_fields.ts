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
 * Validate partial updates of customer profile optional fields.
 *
 * Business purpose: Ensure that the customer profile update API supports
 * PATCH-like semantics via the IShoppingMallCustomerProfile.IUpdate DTO where
 * all properties are optional. When a PUT
 * /shoppingMall/customer/customers/{customerId}/profile request provides only a
 * subset of optional fields, only those fields should change while omitted
 * fields retain their previous values. Additionally, updated_at must move
 * forward while created_at remains stable.
 *
 * Steps:
 *
 * 1. Register (join) a new customer to obtain an authenticated customer context
 *    and id.
 * 2. Create a customer cart to simulate an active shopping session context.
 * 3. Perform an initial full profile update setting all optional profile fields
 *    (full_name, phone_number, locale, time_zone) to known values.
 * 4. Perform a second profile update that only changes locale and time_zone,
 *    omitting full_name and phone_number in the request body.
 * 5. Verify that locale and time_zone changed to the new values, while full_name
 *    and phone_number remain as originally set.
 * 6. Verify that created_at is the same across both responses, and updated_at is
 *    later after the second update.
 */
export async function test_api_customer_profile_partial_update_with_optional_fields(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join)
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

  // 2. Create a cart for this customer to simulate active context
  const cartBody = {
    actor_type: "customer",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  // 3. Initial full profile update with all optional fields set
  const initialFullName = RandomGenerator.name();
  const initialPhoneNumber = RandomGenerator.mobile();
  const initialLocale = "en-US";
  const initialTimeZone = "Asia/Seoul";

  const initialUpdateBody = {
    full_name: initialFullName,
    phone_number: initialPhoneNumber,
    locale: initialLocale,
    time_zone: initialTimeZone,
  } satisfies IShoppingMallCustomerProfile.IUpdate;

  const profileAfterInitial: IShoppingMallCustomerProfile =
    await api.functional.shoppingMall.customer.customers.profile.update(
      connection,
      {
        customerId: authorized.id,
        body: initialUpdateBody,
      },
    );
  typia.assert(profileAfterInitial);

  const createdAtInitial = new Date(profileAfterInitial.created_at).getTime();
  const updatedAtInitial = new Date(profileAfterInitial.updated_at).getTime();

  // 4. Second partial update: only locale and time_zone
  const newLocale = "ko-KR";
  const newTimeZone = "America/Los_Angeles";

  const partialUpdateBody = {
    locale: newLocale,
    time_zone: newTimeZone,
  } satisfies IShoppingMallCustomerProfile.IUpdate;

  const profileAfterPartial: IShoppingMallCustomerProfile =
    await api.functional.shoppingMall.customer.customers.profile.update(
      connection,
      {
        customerId: authorized.id,
        body: partialUpdateBody,
      },
    );
  typia.assert(profileAfterPartial);

  const createdAtPartial = new Date(profileAfterPartial.created_at).getTime();
  const updatedAtPartial = new Date(profileAfterPartial.updated_at).getTime();

  // 5. Validate field values and timestamps
  TestValidator.equals(
    "created_at should remain unchanged across profile updates",
    profileAfterPartial.created_at,
    profileAfterInitial.created_at,
  );

  TestValidator.predicate(
    "updated_at should advance after partial profile update",
    updatedAtPartial > updatedAtInitial,
  );

  TestValidator.equals(
    "full_name should remain unchanged when omitted in partial update",
    profileAfterPartial.full_name,
    profileAfterInitial.full_name,
  );

  TestValidator.equals(
    "phone_number should remain unchanged when omitted in partial update",
    profileAfterPartial.phone_number,
    profileAfterInitial.phone_number,
  );

  TestValidator.equals(
    "locale should reflect the new value after partial update",
    profileAfterPartial.locale,
    newLocale,
  );

  TestValidator.equals(
    "time_zone should reflect the new value after partial update",
    profileAfterPartial.time_zone,
    newTimeZone,
  );
}
