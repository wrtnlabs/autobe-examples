import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";

/**
 * Validate that customer join rejects duplicate email registration.
 *
 * Business goal:
 *
 * - Ensure that POST /auth/customer/join enforces uniqueness of customer email so
 *   that a second registration attempt with the same email fails.
 * - Confirm that a successful first registration returns a valid
 *   IShoppingMallCustomer.IAuthorized object including token information.
 * - Confirm that when a duplicate email is used, the backend does not create
 *   another account/session and instead responds with a client error.
 *
 * Test steps:
 *
 * 1. Build a valid IShoppingMallCustomerJoin.IRequest payload with a unique email,
 *    valid password, and realistic href/referrer URIs.
 * 2. Call api.functional.auth.customer.join(connection, { body }) and assert the
 *    response type with typia.assert.
 * 3. Immediately construct a second join request reusing the same email but with a
 *    different password and context (href/referrer may differ).
 * 4. Call join again wrapped by TestValidator.error to ensure it throws; do not
 *    assert status code or error message details.
 * 5. Optionally assert that the first authorized payload is still structurally
 *    valid via typia.assert and basic business checks (e.g., email equality).
 */
export async function test_api_customer_join_rejects_duplicate_email_registration(
  connection: api.IConnection,
) {
  // 1. First successful registration with unique email
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const firstJoinBody = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const firstAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: firstJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(firstAuthorized);

  // Basic sanity checks on first response
  TestValidator.equals(
    "first join returns the same email as requested",
    firstAuthorized.email,
    email,
  );

  TestValidator.predicate(
    "first join marks customer status as non-empty string",
    firstAuthorized.status.length > 0,
  );

  TestValidator.predicate(
    "first join returns a non-empty access token",
    firstAuthorized.token.access.length > 0,
  );

  // 2. Second registration attempt with the same email must fail
  const secondJoinBody = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  await TestValidator.error(
    "duplicate customer join with same email should fail",
    async () => {
      await api.functional.auth.customer.join(connection, {
        body: secondJoinBody,
      });
    },
  );

  // No further assertions about database state are possible here because we
  // only have the auth.join endpoint. The error itself confirms uniqueness
  // enforcement from the consumer perspective.
}
