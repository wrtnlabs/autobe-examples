import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallCustomerRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerRefresh";

/**
 * Validate that customer login issues tokens with coherent expiry and refresh
 * semantics.
 *
 * 1. Join a new customer with random but valid join payload.
 * 2. Login with the same credentials and obtain an authorized customer token
 *    payload.
 * 3. Ensure access/refresh tokens are non-empty and their expiry fields are future
 *    timestamps with refreshable_until >= expired_at.
 * 4. Refresh using the login-issued refresh token and confirm a new token set with
 *    expiry moving forward.
 * 5. Optionally check that at least one of access/refresh values changes after
 *    refresh.
 */
export async function test_api_customer_login_issues_tokens_with_expiry_consistent_with_policy(
  connection: api.IConnection,
) {
  // 1. Register (join) a new customer
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const joinBody = {
    email,
    password,
    // ip is optional, let server derive it
    href,
    referrer,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Login with the same credentials
  const loginBody = {
    email,
    password,
    // ip is optional; explicitly pass null to let server derive it
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const loggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  const loginToken: IAuthorizationToken = loggedIn.token;
  typia.assert(loginToken);

  // 3. Validate token structure and temporal coherence for login-issued tokens
  TestValidator.predicate(
    "login access token should be non-empty",
    () => loginToken.access.length > 0,
  );
  TestValidator.predicate(
    "login refresh token should be non-empty",
    () => loginToken.refresh.length > 0,
  );

  const loginExpiredAt = new Date(loginToken.expired_at).getTime();
  const loginRefreshableUntil = new Date(
    loginToken.refreshable_until,
  ).getTime();
  const now = Date.now();

  TestValidator.predicate(
    "login access token expiry should be in the future",
    () => loginExpiredAt > now,
  );
  TestValidator.predicate(
    "login refreshable_until should be in the future",
    () => loginRefreshableUntil > now,
  );
  TestValidator.predicate(
    "login refreshable_until should be >= expired_at",
    () => loginRefreshableUntil >= loginExpiredAt,
  );

  // 4. Refresh tokens using the login-issued refresh token
  const refreshBody = {
    refreshToken: loginToken.refresh,
  } satisfies IShoppingMallCustomerRefresh.IRequest;

  const refreshed: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  const refreshTokenObj: IAuthorizationToken = refreshed.token;
  typia.assert(refreshTokenObj);

  TestValidator.predicate(
    "refreshed access token should be non-empty",
    () => refreshTokenObj.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token should be non-empty",
    () => refreshTokenObj.refresh.length > 0,
  );

  const refreshedExpiredAt = new Date(refreshTokenObj.expired_at).getTime();
  const refreshedRefreshableUntil = new Date(
    refreshTokenObj.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "refreshed access token expiry should be in the future",
    () => refreshedExpiredAt > now,
  );
  TestValidator.predicate(
    "refreshed refreshable_until should be in the future",
    () => refreshedRefreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshed refreshable_until should be >= refreshed expired_at",
    () => refreshedRefreshableUntil >= refreshedExpiredAt,
  );

  // 5. Ensure that refreshed expiry window is not before the original
  TestValidator.predicate(
    "refreshed expiry should be same or later than login expiry",
    () => refreshedExpiredAt >= loginExpiredAt,
  );
  TestValidator.predicate(
    "refreshed refreshable_until should be same or later than original",
    () => refreshedRefreshableUntil >= loginRefreshableUntil,
  );

  // Optional: check that at least one of access/refresh token values changed
  TestValidator.predicate(
    "at least one of access or refresh token should rotate on refresh",
    () =>
      refreshTokenObj.access !== loginToken.access ||
      refreshTokenObj.refresh !== loginToken.refresh,
  );
}
