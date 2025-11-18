import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerAuthRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthRefresh";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate successful seller token refresh with a valid refresh token.
 *
 * ## Business intent
 *
 * This scenario ensures that a seller who has already authenticated can
 * successfully refresh their JWT token set using a valid refresh token. The
 * `/auth/seller/refresh` endpoint must:
 *
 * - Accept a previously issued refresh token.
 * - Return a new `IShoppingMallSeller.IAuthorized` payload.
 * - Preserve the seller identity and account state fields.
 * - Rotate (or at least regenerate) the access token.
 * - Maintain or extend the refresh token validity window.
 *
 * ## Test flow
 *
 * 1. Register a new seller using `/auth/seller/join` with a random but
 *    syntactically valid payload (`IShoppingMallSellerAuthJoin.IRequest`).
 *
 *    - This both creates the seller row and issues an initial authorized context
 *         with tokens.
 * 2. Perform an explicit login using `/auth/seller/login` with the same
 *    credentials, obtaining a fresh `IShoppingMallSeller.IAuthorized` instance.
 *    This simulates a typical login flow and ensures we have a clear baseline
 *    authorized object (`loginAuthorized`).
 * 3. Extract `loginAuthorized.token.refresh` as the refresh token input.
 * 4. Call `/auth/seller/refresh` with body
 *    `IShoppingMallSellerAuthRefresh.IRequest` using that refresh token.
 * 5. Validate the `refreshAuthorized` response:
 *
 *    - Type-check via `typia.assert(refreshAuthorized)`.
 *    - Identity invariants:
 *
 *         - `refreshAuthorized.id` equals `loginAuthorized.id`.
 *         - `refreshAuthorized.email` equals `loginAuthorized.email`.
 *         - `refreshAuthorized.status` equals `loginAuthorized.status`.
 *         - `refreshAuthorized.email_verified` equals `loginAuthorized.email_verified`.
 *    - Token behavior:
 *
 *         - `refreshAuthorized.token.access` must differ from
 *                   `loginAuthorized.token.access` (access token rotation).
 *         - `refreshAuthorized.token.expired_at` must not be earlier than
 *                   `loginAuthorized.token.expired_at`.
 *         - `refreshAuthorized.token.refreshable_until` must not be earlier than
 *                   `loginAuthorized.token.refreshable_until`.
 * 6. Usability of the refreshed token set:
 *
 *    - Call `/auth/seller/refresh` again, this time using
 *         `refreshAuthorized.token.refresh` as the refresh token.
 *    - As the SDK automatically updates `connection.headers.Authorization` on each
 *         auth call, the second refresh implicitly proves that the first
 *         refresh’s tokens were valid and authenticated.
 *    - Validate the second `IShoppingMallSeller.IAuthorized` response with
 *         `typia.assert` and check the same identity invariants.
 *
 * ## Notes and constraints
 *
 * - This test focuses exclusively on the happy-path refresh success scenario and
 *   does not attempt to provoke type errors or HTTP failure codes.
 * - It does not directly inspect `connection.headers`, relying instead on the
 *   SDK’s documented behavior that auth calls update `Authorization`
 *   automatically.
 */
export async function test_api_seller_refresh_success_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // 1. Register a new seller via join
  const joinBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const joined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Login with the same credentials to get a clean authorized context
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
    ip: joinBody.ip ?? null,
    href: joinBody.href,
    referrer: joinBody.referrer,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const loggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // Basic invariant sanity check between join and login responses
  TestValidator.equals(
    "joined and logged-in seller id must match",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "joined and logged-in seller email must match",
    loggedIn.email,
    joined.email,
  );

  // 3. Use login-issued refresh token to call refresh
  const refreshBody = {
    refreshToken: loggedIn.token.refresh,
  } satisfies IShoppingMallSellerAuthRefresh.IRequest;

  const refreshed: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // 4. Identity invariants between login and first refresh
  TestValidator.equals(
    "refresh preserves seller id",
    refreshed.id,
    loggedIn.id,
  );
  TestValidator.equals(
    "refresh preserves seller email",
    refreshed.email,
    loggedIn.email,
  );
  TestValidator.equals(
    "refresh preserves seller status",
    refreshed.status,
    loggedIn.status,
  );
  TestValidator.equals(
    "refresh preserves email_verified flag",
    refreshed.email_verified,
    loggedIn.email_verified,
  );

  // 5. Token rotation and validity window checks
  const originalToken: IAuthorizationToken = loggedIn.token;
  const refreshedToken: IAuthorizationToken = refreshed.token;

  TestValidator.notEquals(
    "access token must rotate after refresh",
    refreshedToken.access,
    originalToken.access,
  );

  // expired_at and refreshable_until should not move backwards
  TestValidator.predicate(
    "refreshed access token expiry must not be earlier than original",
    refreshedToken.expired_at >= originalToken.expired_at,
  );
  TestValidator.predicate(
    "refreshed refresh token validity must not be earlier than original",
    refreshedToken.refreshable_until >= originalToken.refreshable_until,
  );

  // 6. Use refreshed refresh token to perform another refresh, proving usability
  const secondRefreshBody = {
    refreshToken: refreshedToken.refresh,
  } satisfies IShoppingMallSellerAuthRefresh.IRequest;

  const refreshedAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.refresh(connection, {
      body: secondRefreshBody,
    });
  typia.assert(refreshedAgain);

  // Identity invariants must still hold
  TestValidator.equals(
    "second refresh preserves seller id",
    refreshedAgain.id,
    loggedIn.id,
  );
  TestValidator.equals(
    "second refresh preserves seller email",
    refreshedAgain.email,
    loggedIn.email,
  );
  TestValidator.equals(
    "second refresh preserves seller status",
    refreshedAgain.status,
    loggedIn.status,
  );
  TestValidator.equals(
    "second refresh preserves email_verified flag",
    refreshedAgain.email_verified,
    loggedIn.email_verified,
  );
}
