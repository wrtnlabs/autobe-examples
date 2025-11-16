import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test multiple sequential logins from the same member account.
 *
 * Validates that a member can perform multiple sequential login operations and
 * that each login creates a distinct session record with unique tokens. This
 * tests the system's support for concurrent sessions across multiple devices
 * and verifies proper session isolation and tracking.
 *
 * Process:
 *
 * 1. Register a new member account with credentials
 * 2. Perform first login and capture the token and session information
 * 3. Perform second login with the same credentials from different context
 * 4. Verify both logins succeeded and generated unique tokens
 * 5. Validate that both login sessions are properly tracked separately
 */
export async function test_api_member_login_multiple_sequential_logins(
  connection: api.IConnection,
) {
  // Generate member registration data
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(8);
  const password = "TestPassword123!@#";
  const baseHref = "https://example.com/auth";
  const baseReferrer = "https://example.com";

  // Step 1: Register a new member account
  const registerResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: email,
      username: username,
      password: password,
      href: baseHref,
      referrer: baseReferrer,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(registerResponse);

  // Create unauthenticated connection for subsequent logins
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 2: Perform first login
  const firstLogin = await api.functional.auth.member.login(unauthConn, {
    body: {
      email: email,
      password: password,
      href: baseHref + "/login1",
      referrer: baseReferrer + "/home",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(firstLogin);

  const firstLoginToken = firstLogin.token.access;
  const firstLoginRefresh = firstLogin.token.refresh;
  const firstLoginExpiredAt = firstLogin.token.expired_at;

  // Step 3: Perform second login from different context
  const secondLogin = await api.functional.auth.member.login(unauthConn, {
    body: {
      email: email,
      password: password,
      href: baseHref + "/login2",
      referrer: baseReferrer + "/profile",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(secondLogin);

  const secondLoginToken = secondLogin.token.access;
  const secondLoginRefresh = secondLogin.token.refresh;
  const secondLoginExpiredAt = secondLogin.token.expired_at;

  // Step 4: Verify both logins succeeded and generated unique access tokens
  TestValidator.notEquals(
    "first and second login access tokens should be different",
    firstLoginToken,
    secondLoginToken,
  );

  // Step 5: Verify both logins generated unique refresh tokens
  TestValidator.notEquals(
    "first and second login refresh tokens should be different",
    firstLoginRefresh,
    secondLoginRefresh,
  );

  // Step 6: Verify both logins generated unique expiration timestamps
  TestValidator.notEquals(
    "expiration times should be different between sequential logins",
    firstLoginExpiredAt,
    secondLoginExpiredAt,
  );

  // Step 7: Verify member account was successfully created
  TestValidator.predicate(
    "member ID from registration should be valid UUID",
    registerResponse.id.length === 36 && registerResponse.id.includes("-"),
  );
}
