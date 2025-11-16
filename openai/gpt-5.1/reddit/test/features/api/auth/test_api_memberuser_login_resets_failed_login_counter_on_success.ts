import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Verify that a successful memberUser login clears prior failed login attempts
 * when the account has not been locked.
 *
 * Scenario:
 *
 * 1. Register a new member user via /auth/memberUser/join, capturing the chosen
 *    username, email, and password.
 * 2. Execute one or more failed login attempts via /auth/memberUser/login using
 *    the same identifier (we'll use the username) but an incorrect password, to
 *    cause failed_login_count to increase while the account is still not
 *    locked.
 * 3. Perform a login with the correct password and verify that the response is an
 *    ICommunityPlatformMemberuser.IAuthorized object where failed_login_count
 *    has been reset to 0 and locked_until is null/ undefined (no active lock
 *    window).
 * 4. Perform a subsequent successful login with correct credentials to ensure
 *    ongoing access is not impacted by earlier failures.
 *
 * Notes and constraints:
 *
 * - We do not know the exact lockout threshold, so we will only perform a small
 *   number (e.g., 1 or 2) of failed logins, and we will assert only that
 *   locked_until is null/undefined before the successful login (not the
 *   absolute numeric value of failed_login_count before reset).
 * - The main business assertion is that after a successful login,
 *   failed_login_count is 0 and locked_until is null/undefined, even when there
 *   have been previous failed attempts for the same account.
 */
export async function test_api_memberuser_login_resets_failed_login_counter_on_success(
  connection: api.IConnection,
) {
  // 1. Register a new member user with deterministic credentials so we can
  //    intentionally log in with wrong and then correct passwords.
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    username: RandomGenerator.alphabets(10),
    email: `user+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password,
    // Allow backend to derive IP, just provide basic context URLs.
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const joined: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Basic sanity: a fresh account should have failed_login_count === 0 and
  // locked_until === null/undefined.
  TestValidator.equals(
    "freshly joined memberUser should start with failed_login_count = 0",
    joined.failed_login_count,
    0,
  );
  TestValidator.predicate(
    "freshly joined memberUser should start unlocked (locked_until null/undefined)",
    joined.locked_until === null || joined.locked_until === undefined,
  );

  // 2. Perform a couple of failed login attempts with wrong password to bump
  //    failed_login_count without triggering a lockout (exact threshold is
  //    unknown so we'll just do 1 failed attempt).
  const wrongPassword = `${password}x`;
  await TestValidator.error(
    "login with wrong password should fail and increment failed_login_count",
    async () => {
      await api.functional.auth.memberUser.login(connection, {
        body: {
          identifier: joinBody.username,
          password: wrongPassword,
          ip: null,
          href: "https://client.example.com/login",
          referrer: "https://client.example.com/login-form",
        } satisfies ICommunityPlatformMemberuser.ILogin,
      });
    },
  );

  // 3. Perform login with the correct password.
  const successLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: joinBody.username,
        password,
        ip: null,
        href: "https://client.example.com/login",
        referrer: "https://client.example.com/login-form",
      } satisfies ICommunityPlatformMemberuser.ILogin,
    });
  typia.assert(successLogin);

  // Business assertions after successful login.
  TestValidator.equals(
    "successful login should reset failed_login_count back to 0",
    successLogin.failed_login_count,
    0,
  );
  TestValidator.predicate(
    "successful login should result in unlocked account (locked_until null/undefined)",
    successLogin.locked_until === null ||
      successLogin.locked_until === undefined,
  );

  // 4. Perform a subsequent successful login with the same credentials to
  //    confirm that prior failed attempts do not keep affecting success.
  const secondSuccess: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: joinBody.username,
        password,
        ip: null,
        href: "https://client.example.com/login",
        referrer: "https://client.example.com/after-success",
      } satisfies ICommunityPlatformMemberuser.ILogin,
    });
  typia.assert(secondSuccess);

  TestValidator.equals(
    "subsequent successful login should also have failed_login_count = 0",
    secondSuccess.failed_login_count,
    0,
  );
  TestValidator.predicate(
    "subsequent successful login should remain unlocked",
    secondSuccess.locked_until === null ||
      secondSuccess.locked_until === undefined,
  );
}
