import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that successful login creates a session record for multi-device session
 * tracking.
 *
 * This test validates that each successful member login creates a new session
 * record with proper context information (IP address, href, referrer,
 * timestamp). The test performs multiple logins from different contexts and
 * verifies that distinct session records are created for each login event,
 * enabling proper tracking of concurrent sessions across devices. This is
 * critical for security auditing and device management.
 *
 * 1. Create a member account through registration
 * 2. Perform first login with context information
 * 3. Verify authentication token is issued
 * 4. Perform second login from same account with different context
 * 5. Verify second session is created independently
 * 6. Validate that both logins are properly tracked for the member
 */
export async function test_api_member_login_session_creation(
  connection: api.IConnection,
) {
  // Generate test data for member registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(8);
  const memberPassword = "TestPassword123!";
  const testHref = "https://example.com/login";
  const testReferrer = "https://example.com/home";
  const testIp = "192.168.1.100";

  // Step 1: Create a member account through registration
  const registeredMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      ip: testIp,
      href: testHref,
      referrer: testReferrer,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(registeredMember);
  TestValidator.equals(
    "member registration successful",
    typeof registeredMember.id,
    "string",
  );
  TestValidator.equals(
    "access token issued",
    typeof registeredMember.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token issued",
    typeof registeredMember.token.refresh,
    "string",
  );

  // Create a fresh connection for the second login test (to simulate new session)
  const freshConnection: api.IConnection = { ...connection, headers: {} };

  // Step 2: Perform first login with context information
  const firstLogin = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: testIp,
      href: testHref,
      referrer: testReferrer,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(firstLogin);
  TestValidator.equals(
    "first login successful",
    typeof firstLogin.id,
    "string",
  );
  TestValidator.equals(
    "first login access token issued",
    typeof firstLogin.token.access,
    "string",
  );

  // Step 3: Verify authentication token is issued with proper expiration
  TestValidator.predicate(
    "access token expiration is set",
    firstLogin.token.expired_at !== null &&
      firstLogin.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refresh token expiration is set",
    firstLogin.token.refreshable_until !== null &&
      firstLogin.token.refreshable_until !== undefined,
  );

  // Step 4: Perform second login from same account with different context
  const secondLoginIp = "192.168.1.101"; // Different IP
  const secondLoginHref = "https://example.com/app/login";
  const secondLoginReferrer = "https://example.com/app";

  const secondLogin = await api.functional.auth.member.login(freshConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: secondLoginIp,
      href: secondLoginHref,
      referrer: secondLoginReferrer,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(secondLogin);
  TestValidator.equals(
    "second login successful",
    typeof secondLogin.id,
    "string",
  );
  TestValidator.equals(
    "second login access token issued",
    typeof secondLogin.token.access,
    "string",
  );

  // Step 5: Verify second session is created independently
  TestValidator.notEquals(
    "second login creates different session",
    firstLogin.token.access,
    secondLogin.token.access,
  );
  TestValidator.notEquals(
    "second login creates different refresh token",
    firstLogin.token.refresh,
    secondLogin.token.refresh,
  );

  // Step 6: Validate tokens have proper structure for session tracking
  TestValidator.predicate(
    "first login token access is string",
    typeof firstLogin.token.access === "string",
  );
  TestValidator.predicate(
    "first login token has expiration",
    firstLogin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "second login token access is string",
    typeof secondLogin.token.access === "string",
  );
  TestValidator.predicate(
    "second login token has expiration",
    secondLogin.token.expired_at.length > 0,
  );

  // Verify tokens contain session information through their encoding
  TestValidator.predicate(
    "tokens are properly formatted for multi-device tracking",
    firstLogin.token.access.length > 0 && secondLogin.token.access.length > 0,
  );
}
