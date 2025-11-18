import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";

/**
 * Verify that customer account update requires authentication.
 *
 * Business intent: This test ensures that the customer update endpoint `PUT
 * /shoppingMall/customer/customers/{customerId}` cannot be invoked anonymously
 * and that the backend enforces authentication for this customer-scoped
 * operation.
 *
 * Scenario steps:
 *
 * 1. Register a new customer via `POST /auth/customer/join` to obtain a valid
 *    `customerId` and an authenticated customer context.
 * 2. Derive an unauthenticated connection instance that has no `Authorization`
 *    header attached.
 * 3. Build a syntactically valid `IShoppingMallCustomer.IUpdate` payload (here,
 *    toggling the `email_verified` flag value).
 * 4. Call `api.functional.shoppingMall.customer.customers.update` with the
 *    unauthenticated connection, targeting the newly created customer.
 * 5. Assert that the unauthenticated call fails using `TestValidator.error`,
 *    proving that authentication is required for this endpoint.
 *
 * Notes:
 *
 * - The test does not inspect HTTP status codes or response bodies; it only
 *   verifies that some error is thrown for an anonymous update attempt.
 * - No type-error scenarios are used: both the join and update bodies strictly
 *   conform to their respective DTOs.
 */
export async function test_api_customer_update_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new customer to obtain a valid customerId and an authenticated connection
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

  // 2. Derive an unauthenticated connection by cloning host/options but clearing headers
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Prepare a syntactically valid update payload; any subset of optional fields is fine
  const updateBody = {
    // flip email_verified flag to the opposite of current, but value itself is irrelevant
    email_verified: !authorized.email_verified,
  } satisfies IShoppingMallCustomer.IUpdate;

  // 4. Attempt to call the update endpoint without Authorization; expect it to fail
  await TestValidator.error(
    "customer update requires authentication",
    async () => {
      await api.functional.shoppingMall.customer.customers.update(
        unauthenticated,
        {
          customerId: authorized.id,
          body: updateBody,
        },
      );
    },
  );
}
