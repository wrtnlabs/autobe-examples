import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";

/**
 * Validate that an authenticated customer can delete their own account.
 *
 * Business context:
 *
 * - A customer registers via the shoppingMall self-service join endpoint.
 * - The join operation returns an authorized customer payload and configures the
 *   shared API connection with an Authorization header for that customer.
 * - Using that same authenticated context, the customer deletes their own account
 *   via the customer erase endpoint.
 *
 * Covered steps:
 *
 * 1. Call POST /auth/customer/join through api.functional.auth.customer.join to
 *    register a fresh customer and obtain IShoppingMallCustomer.IAuthorized
 *    (including id and token).
 * 2. Confirm the shape of the join response using typia.assert.
 * 3. Invoke DELETE /shoppingMall/customer/customers/{customerId} using
 *    api.functional.shoppingMall.customer.customers.erase with the id from step
 *    1 as customerId, reusing the same connection so that the Authorization
 *    header set by join is applied.
 * 4. Treat successful completion (no HttpError thrown) as success of the deletion
 *    flow; no follow-up read endpoints are available to prove non-existence, so
 *    the test scope is limited to the happy-path behavior of the erase call
 *    itself.
 */
export async function test_api_customer_self_account_deletion_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer and obtain an authorized customer payload.
  const joinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Verify that the customer id from the authorized payload looks valid
  //    and will be used as the deletion target.
  await TestValidator.predicate(
    "customer id should be a non-empty string",
    () =>
      typeof authorizedCustomer.id === "string" &&
      authorizedCustomer.id.length > 0,
  );

  // 3. Delete the customer account using the same authenticated connection.
  await api.functional.shoppingMall.customer.customers.erase(connection, {
    customerId: authorizedCustomer.id,
  });

  // 4. If erase completes without throwing, consider the deletion successful.
  //    As there is no return body (void), no further type assertions are needed.
}
