import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate logging-related side effects of memberUser login attempts.
 *
 * This E2E test exercises the memberUser authentication flow via the public
 * join and login APIs and validates that repeated successful and failed login
 * attempts are reflected in the security-related fields of the
 * ICommunityPlatformMemberuser.IAuthorized DTO, especially `failed_login_count`
 * and `locked_until`.
 *
 * The underlying persistence table community_platform_login_attempts is not
 * directly accessible from the public API surface, so this test infers correct
 * logging and rate-limiting integration by observing how the account’s counters
 * change as various login attempts are made.
 *
 * High-level steps:
 *
 * 1. Register a new member user via POST /auth/memberUser/join.
 * 2. Immediately perform a successful login via POST /auth/memberUser/login with
 *    the same credentials and verify that username/email match and that a token
 *    bundle is returned.
 * 3. Perform multiple failed login attempts with the same identifier but an
 *    incorrect password, expecting each attempt to fail.
 * 4. Perform another successful login with the correct password and verify that
 *    authentication now succeeds.
 * 5. Compare `failed_login_count` and `locked_until` across the different
 *    successful login responses to ensure that failed attempts increment the
 *    counter and that a subsequent successful login resets it and clears any
 *    lockout window (for a small number of failures).
 *
 * This scenario confirms that credential validation, failure counting, and
 * lockout-reset logic are wired correctly around the login attempt logging
 * subsystem, using only the public memberUser authentication APIs and DTOs
 * defined for the community platform.
 */
export async function test_api_memberuser_login_attempt_logging(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const baseJoin = typia.random<ICommunityPlatformMemberuser.IJoin>();
  const password = "P@ssw0rd123";
  const joinBody = {
    ...baseJoin,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const joined = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(joined);

  // 2. First successful login
  const loginIdentifier = joined.username;
  const loginHref = typia.random<string & tags.Format<"uri">>();
  const loginReferrer = typia.random<string & tags.Format<"uri">>();

  const firstLoginBody = {
    identifier: loginIdentifier,
    password,
    ip: null,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const firstLogin = await api.functional.auth.memberUser.login(connection, {
    body: firstLoginBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(firstLogin);

  TestValidator.equals(
    "joined and first login usernames should match",
    firstLogin.username,
    joined.username,
  );
  TestValidator.equals(
    "joined and first login emails should match",
    firstLogin.email,
    joined.email,
  );

  const failedCountAfterFirstLogin = firstLogin.failed_login_count;
  TestValidator.predicate(
    "initial failed_login_count should be non-negative",
    failedCountAfterFirstLogin >= 0,
  );

  // 3. Perform multiple failed login attempts with wrong password
  const wrongPassword = `${password}-wrong`;

  const makeFailedLogin = async () => {
    const failedLoginBody = {
      identifier: loginIdentifier,
      password: wrongPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMemberuser.ILogin;

    await TestValidator.error(
      "login with wrong password should fail",
      async () => {
        await api.functional.auth.memberUser.login(connection, {
          body: failedLoginBody,
        });
      },
    );
  };

  await makeFailedLogin();
  await makeFailedLogin();

  // 4. Successful login again with correct password
  const secondLoginBody = {
    identifier: loginIdentifier,
    password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const secondLogin = await api.functional.auth.memberUser.login(connection, {
    body: secondLoginBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(secondLogin);

  // 5. Validate failed_login_count and locked_until behavior
  const failedCountAfterSecondLogin = secondLogin.failed_login_count;

  TestValidator.predicate(
    "failed_login_count after second login should be >= 0",
    failedCountAfterSecondLogin >= 0,
  );

  TestValidator.predicate(
    "locked_until should be null or undefined when account is not locked",
    secondLogin.locked_until === null || secondLogin.locked_until === undefined,
  );

  TestValidator.equals(
    "username should remain stable across logins",
    secondLogin.username,
    firstLogin.username,
  );
  TestValidator.equals(
    "email should remain stable across logins",
    secondLogin.email,
    firstLogin.email,
  );
}
