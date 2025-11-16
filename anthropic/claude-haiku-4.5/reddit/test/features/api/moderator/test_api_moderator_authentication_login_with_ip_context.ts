import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator login with complete session context including client IP
 * address for security tracking.
 *
 * This test validates the moderator authentication flow with comprehensive
 * session context information. The workflow demonstrates a complete login
 * lifecycle: from moderator account creation through authentication with
 * IP-based session tracking for security and fraud detection purposes.
 *
 * The test ensures that:
 *
 * 1. Moderators can successfully register with initial authentication tokens
 * 2. Login operations properly handle optional IP context for geographic and
 *    security tracking
 * 3. Session context (href and referrer) is validated during authentication
 * 4. Authorization responses contain valid JWT tokens for subsequent authenticated
 *    requests
 * 5. Token management is properly integrated into the connection headers
 *
 * This validates that the authentication system correctly processes session
 * metadata for audit trails and fraud detection while maintaining secure token
 * issuance.
 */
export async function test_api_moderator_authentication_login_with_ip_context(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account with session context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(10);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const registrationIp = "192.168.1.100";
  const registrationHref = "https://community.example.com/auth/register";
  const registrationReferrer = "https://example.com";

  const registered = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      ip: registrationIp,
      href: registrationHref,
      referrer: registrationReferrer,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(registered);

  TestValidator.predicate(
    "registration successful with valid token issued",
    registered.token.access.length > 0 && registered.token.refresh.length > 0,
  );

  // Step 2: Perform login with session context including IP address
  const loginHref = "https://community.example.com/auth/login";
  const loginReferrer = "https://community.example.com";
  const loginIp = "192.168.1.101";

  const loginResponse = await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: loginIp,
      href: loginHref,
      referrer: loginReferrer,
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  typia.assert(loginResponse);

  // Step 3: Verify login response matches registered moderator identity
  TestValidator.equals(
    "login response contains registered moderator ID",
    loginResponse.id,
    registered.id,
  );
  TestValidator.equals(
    "login response contains registered moderator email",
    loginResponse.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "login response contains registered moderator username",
    loginResponse.username,
    moderatorUsername,
  );

  // Step 4: Validate JWT token validity and expiration
  TestValidator.predicate(
    "access token expiration is in the future",
    new Date(loginResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token expiration is in the future",
    new Date(loginResponse.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "refresh token expiration is later than access token expiration",
    new Date(loginResponse.token.refreshable_until) >
      new Date(loginResponse.token.expired_at),
  );

  // Step 5: Validate moderator account status
  TestValidator.equals(
    "moderator account status is active after login",
    loginResponse.account_status,
    "active",
  );
  TestValidator.predicate(
    "moderator account email is verified",
    loginResponse.email_verified === true,
  );
  TestValidator.predicate(
    "moderator has non-negative karma score",
    loginResponse.karma_score >= 0,
  );

  // Step 6: Verify authentication context was integrated into connection
  TestValidator.predicate(
    "connection headers contain authorization token after login",
    connection.headers?.Authorization === loginResponse.token.access,
  );
}
