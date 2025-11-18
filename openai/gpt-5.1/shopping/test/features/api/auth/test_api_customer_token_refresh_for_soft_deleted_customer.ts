import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerRefresh";

/**
 * Validate customer refresh token rotation and stale-token rejection.
 *
 * Business intent:
 *
 * - Start from a fresh customer who has just joined and obtained an authorization
 *   token with both access and refresh tokens.
 * - Verify that POST /auth/customer/refresh successfully issues a new
 *   IShoppingMallCustomer.IAuthorized payload when provided a valid refresh
 *   token.
 * - Then verify that trying to reuse the original, now-stale refresh token fails,
 *   which stands in for server-side state checks similar to soft-deletion or
 *   revocation.
 *
 * We cannot directly soft-delete (set deleted_at on) the customer using public
 * APIs, so we instead use refresh-token rotation as a proxy to validate that
 * the refresh endpoint consults server-side token/session state and does not
 * blindly accept any previously issued refresh token.
 *
 * High-level steps:
 *
 * 1. Call api.functional.auth.customer.join with a random but valid
 *    IShoppingMallCustomerJoin.IRequest to create a customer and get
 *    IShoppingMallCustomer.IAuthorized.
 * 2. Capture the initial refresh token from authorized.token.refresh.
 * 3. Call api.functional.auth.customer.refresh with
 *    IShoppingMallCustomerRefresh.IRequest using that refreshToken, assert
 *    success and validate the resulting authorized payload.
 * 4. Compare old vs new tokens to ensure access token changed and (if applicable)
 *    refresh token rotated.
 * 5. Call refresh again with the _old_ refresh token and assert that it fails
 *    using TestValidator.error, modeling rejection of stale or invalidated
 *    tokens.
 */
export async function test_api_customer_token_refresh_for_soft_deleted_customer(
  connection: api.IConnection,
) {
  // 1. Join: create a new customer and obtain initial tokens
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Capture initial tokens
  const initialAccessToken: string = joined.token.access;
  const initialRefreshToken: string = joined.token.refresh;

  // 2. Refresh with the valid refresh token
  const refreshBody = {
    refreshToken: initialRefreshToken,
  } satisfies IShoppingMallCustomerRefresh.IRequest;

  const refreshed: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // 3. Validate token rotation semantics
  TestValidator.notEquals(
    "access token should change after refresh",
    refreshed.token.access,
    initialAccessToken,
  );

  // Refresh token may or may not rotate, but if it does, ensure equality checks behave
  TestValidator.predicate(
    "refresh token is a non-empty string",
    refreshed.token.refresh.length > 0,
  );

  // 4. Attempt to reuse the original (now stale) refresh token
  await TestValidator.error(
    "stale refresh token should be rejected",
    async () => {
      const staleRefreshBody = {
        refreshToken: initialRefreshToken,
      } satisfies IShoppingMallCustomerRefresh.IRequest;

      await api.functional.auth.customer.refresh(connection, {
        body: staleRefreshBody,
      });
    },
  );
}
