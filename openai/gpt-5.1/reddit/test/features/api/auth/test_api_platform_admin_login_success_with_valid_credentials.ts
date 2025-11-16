import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that an existing platform administrator can log in successfully with
 * valid credentials and receives a proper authorized profile and authorization
 * tokens.
 *
 * Business flow:
 *
 * 1. Register a new platform admin via POST /auth/platformAdmin/join with a known
 *    username, email, and password.
 * 2. Create a fresh unauthenticated connection clone so the next call represents a
 *    real login instead of reusing the join-issued token.
 * 3. Call POST /auth/platformAdmin/login with identifier set to the username from
 *    step 1, the same password, and realistic href/referrer (and optional ip).
 * 4. Assert that the response matches ICommunityPlatformPlatformadmin.IAuthorized.
 * 5. Validate that the identity fields (id, username, email, displayName) match
 *    the account created by join.
 * 6. Validate that accountStatus.isLoginAllowed is true.
 * 7. Validate that token.access and token.refresh are non-empty strings and that
 *    expired_at and refreshable_until are valid future timestamps.
 */
export async function test_api_platform_admin_login_success_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin with known credentials
  const password: string = "P@ssw0rd!";
  const joinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const joinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password,
    displayName: RandomGenerator.name(),
    href: joinHref,
    referrer: joinReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const joined: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Create an unauthenticated clone of the connection for login
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // 3. Perform login using username identifier and same password
  const loginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const loginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const loginBody = {
    identifier: joined.username,
    password,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const loggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(unauthConnection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 4. Identity consistency between join and login
  TestValidator.equals(
    "platform admin id must stay consistent between join and login",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "platform admin username must stay consistent between join and login",
    loggedIn.username,
    joined.username,
  );
  TestValidator.equals(
    "platform admin email must stay consistent between join and login",
    loggedIn.email,
    joined.email,
  );
  TestValidator.equals(
    "platform admin displayName must stay consistent between join and login",
    loggedIn.displayName,
    joined.displayName,
  );

  // 5. Account status must allow login for a freshly created admin
  TestValidator.predicate(
    "platform admin accountStatus.isLoginAllowed must be true after successful login",
    loggedIn.accountStatus.isLoginAllowed === true,
  );

  // 6. Token fields validation: non-empty tokens and future expiry
  const token: IAuthorizationToken = loggedIn.token;

  TestValidator.predicate(
    "access token must be a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token must be a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  const now: number = Date.now();

  const expiredAtMs: number = new Date(token.expired_at).getTime();
  const refreshableUntilMs: number = new Date(
    token.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "access token expiry must be in the future",
    Number.isFinite(expiredAtMs) && expiredAtMs > now,
  );
  TestValidator.predicate(
    "refresh token expiry must be in the future and not before access expiry",
    Number.isFinite(refreshableUntilMs) &&
      refreshableUntilMs >= expiredAtMs &&
      refreshableUntilMs > now,
  );
}
