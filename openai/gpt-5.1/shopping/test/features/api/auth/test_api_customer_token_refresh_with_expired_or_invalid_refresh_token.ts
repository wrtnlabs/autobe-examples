import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerRefresh";

/**
 * Validate that customer token refresh rejects invalid refresh tokens without
 * issuing new authorization tokens.
 *
 * ## Business purpose
 *
 * This e2e test ensures that the `POST /auth/customer/refresh` endpoint does
 * not accept clearly invalid refresh tokens. Even when a real customer account
 * exists and has just joined, attempting to refresh with a bogus `refreshToken`
 * string must fail instead of returning a new
 * `IShoppingMallCustomer.IAuthorized` payload.
 *
 * Due to limited public API surface, we cannot directly read or diff the
 * internal customer/session/risk tables, so the test focuses on the externally
 * observable contract: invalid refresh attempts must throw and must not
 * interfere with the general usability of the auth APIs.
 *
 * ## High level steps
 *
 * 1. Register a valid customer via `POST /auth/customer/join`.
 * 2. Build a syntactically invalid refresh token string.
 * 3. Call `POST /auth/customer/refresh` with that invalid token.
 * 4. Assert that the refresh call fails (throws) instead of returning a new
 *    `IAuthorized` object.
 * 5. Perform a follow-up successful `join` call to ensure auth functionality
 *    remains intact after the failed refresh.
 */
export async function test_api_customer_token_refresh_with_expired_or_invalid_refresh_token(
  connection: api.IConnection,
) {
  // 1. Register a valid customer used as a control subject.
  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: typia.random<IShoppingMallCustomerJoin.IRequest>(),
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(joined);

  // 2. Prepare an obviously invalid refresh token string.
  const invalidRefreshToken: string = `invalid-refresh-token-${RandomGenerator.alphaNumeric(12)}`;

  const invalidRequestBody = {
    refreshToken: invalidRefreshToken,
  } satisfies IShoppingMallCustomerRefresh.IRequest;

  // 3. Attempt to refresh tokens with the invalid refresh token and
  //    assert that it fails rather than returning an authorized payload.
  await TestValidator.error(
    "refresh with invalid refresh token must fail",
    async () => {
      await api.functional.auth.customer.refresh(connection, {
        body: invalidRequestBody,
      });
    },
  );

  // 4. Perform a sanity check that auth functionality is still usable
  //    after the failed refresh by registering another customer.
  const secondJoined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: typia.random<IShoppingMallCustomerJoin.IRequest>(),
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(secondJoined);

  // Basic invariants: both join outputs are valid authorized customers
  // and have distinct ids (strong indication that join still works and
  // that the failed refresh attempt has not broken auth flow).
  TestValidator.notEquals(
    "each joined customer must have distinct id",
    joined.id,
    secondJoined.id,
  );
}
