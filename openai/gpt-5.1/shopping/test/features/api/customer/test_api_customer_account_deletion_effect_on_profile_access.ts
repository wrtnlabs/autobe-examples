import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";

export async function test_api_customer_account_deletion_effect_on_profile_access(
  connection: api.IConnection,
) {
  // 1. Register a new customer and obtain authorized payload + token
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // leave ip undefined so that backend derives it; href/referrer required
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(customerAuthorized);

  const customerId = customerAuthorized.id;

  // 2. Sanity check: profile is readable before deletion
  const profileBefore: IShoppingMallCustomerProfile =
    await api.functional.shoppingMall.customer.customers.profile.at(
      connection,
      { customerId },
    );
  typia.assert(profileBefore);

  // business assertion: profile belongs to the joined customer
  TestValidator.equals(
    "profile-before customer id matches joined customer id",
    profileBefore.customer.id,
    customerId,
  );

  // 3. Delete the customer account
  await api.functional.shoppingMall.customer.customers.erase(connection, {
    customerId,
  });

  // 4 & 5. Verify that profile access is no longer permitted using old token
  await TestValidator.error(
    "profile access after customer deletion must fail",
    async () => {
      await api.functional.shoppingMall.customer.customers.profile.at(
        connection,
        { customerId },
      );
    },
  );
}
