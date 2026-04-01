import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test sequential customer profile updates to validate that customers can modify
 * their profile information multiple times. First update sets initial display name
 * and phone number, second update changes both fields to different values. Verify
 * each update returns the correct current state with properly incremented updated_at
 * timestamps. This validates the business requirement that customers can edit their
 * display name and phone number at any time through their profile settings, with
 * changes applied immediately and reflected across the platform.
 */
export async function test_api_customer_profile_update_multiple_times_sequential(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer account
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create customer-specific connection with authentication token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${customerAuth.token.access}`,
    },
  };
  // 3. First profile update - set initial values
  const firstUpdateBody = {
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomerProfile.IUpdate;
  const firstProfile =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: firstUpdateBody,
      },
    );
  typia.assert(firstProfile);
  // 4. Validate first update response
  TestValidator.equals(
    "first display name",
    firstProfile.display_name,
    firstUpdateBody.display_name,
  );
  TestValidator.equals(
    "first phone number",
    firstProfile.phone_number,
    firstUpdateBody.phone_number,
  );
  const firstUpdatedAt = firstProfile.updated_at;
  // 5. Second profile update - change to different values
  const secondUpdateBody = {
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomerProfile.IUpdate;
  const secondProfile =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: secondUpdateBody,
      },
    );
  typia.assert(secondProfile);
  // 6. Validate second update response
  TestValidator.equals(
    "second display name",
    secondProfile.display_name,
    secondUpdateBody.display_name,
  );
  TestValidator.equals(
    "second phone number",
    secondProfile.phone_number,
    secondUpdateBody.phone_number,
  );
  const secondUpdatedAt = secondProfile.updated_at;
  // 7. Verify updated_at timestamp is incremented
  TestValidator.predicate("updated_at incremented", () => {
    const firstTime = new Date(firstUpdatedAt).getTime();
    const secondTime = new Date(secondUpdatedAt).getTime();
    return secondTime >= firstTime;
  });
  // 8. Verify profile ID remains consistent
  TestValidator.equals(
    "profile ID consistent",
    firstProfile.id,
    secondProfile.id,
  );
  // 9. Verify customer relation is preserved
  TestValidator.equals(
    "customer ID consistent",
    firstProfile.customer.id,
    secondProfile.customer.id,
  );
  TestValidator.equals(
    "customer email consistent",
    firstProfile.customer.email,
    secondProfile.customer.email,
  );
}
