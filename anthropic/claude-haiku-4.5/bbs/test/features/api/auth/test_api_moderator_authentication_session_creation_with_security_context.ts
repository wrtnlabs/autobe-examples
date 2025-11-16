import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator authentication and session creation with security context.
 *
 * Validates that when a moderator successfully logs in via POST
 * /auth/moderator/login, the login endpoint properly accepts and processes
 * security context information including:
 *
 * - IP address (IPv4 or IPv6) for tracking login origin
 * - HTTP referrer header value for monitoring access source
 * - Full URL/href of the login entry point for audit trail
 *
 * These security context fields are critical for:
 *
 * - Detecting unauthorized login attempts from unusual IP addresses
 * - Monitoring referrer sources for administrative access patterns
 * - Building audit logs of moderator authentication events
 *
 * Test workflow:
 *
 * 1. Generate valid moderator login credentials and security context
 * 2. Submit login request with email, password, IP address, href, and referrer
 * 3. Verify successful authentication returns complete
 *    IDiscussionBoardModerator.IAuthorized response
 * 4. Validate JWT tokens (access and refresh) are generated with correct structure
 * 5. Confirm moderator information is returned with active account status
 * 6. Verify security context parameters were accepted by the authentication
 *    endpoint
 */
export async function test_api_moderator_authentication_session_creation_with_security_context(
  connection: api.IConnection,
) {
  // Generate realistic security context for login
  const clientIp = "192.168.1.100"; // IPv4 address from client
  const referrerUrl = "https://admin.example.com/dashboard";
  const loginHref = "https://admin.example.com/auth/login";

  // Generate moderator login credentials
  // In production, these would be valid moderator credentials from database
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);

  // Prepare login request with security context
  const loginBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    ip: clientIp,
    href: loginHref,
    referrer: referrerUrl,
  } satisfies IDiscussionBoardModerator.ILogin;

  // Attempt login with security context
  const authorized = await api.functional.auth.moderator.login(connection, {
    body: loginBody,
  });

  // Validate response is properly typed
  typia.assert(authorized);

  // Verify moderator ID is present
  TestValidator.predicate(
    "authorized response should contain moderator ID",
    authorized.id !== undefined && authorized.id.length > 0,
  );

  // Verify token object exists
  TestValidator.predicate(
    "authorized response should contain token object",
    authorized.token !== undefined,
  );

  // Verify moderator summary exists
  TestValidator.predicate(
    "authorized response should contain moderator summary",
    authorized.moderator !== undefined,
  );

  // Validate JWT access token structure
  const token = authorized.token;
  typia.assert(token);

  TestValidator.predicate(
    "JWT access token should be present and non-empty",
    token.access !== undefined && token.access.length > 0,
  );

  TestValidator.predicate(
    "JWT refresh token should be present and non-empty",
    token.refresh !== undefined && token.refresh.length > 0,
  );

  TestValidator.predicate(
    "access token expiration timestamp should be set",
    token.expired_at !== undefined && token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refresh token expiration timestamp should be set",
    token.refreshable_until !== undefined && token.refreshable_until.length > 0,
  );

  // Validate JWT format (standard JWT has three parts separated by dots)
  TestValidator.predicate(
    "access token should follow JWT format structure",
    (token.access.match(/\./g) || []).length === 2,
  );

  TestValidator.predicate(
    "refresh token should follow JWT format structure",
    (token.refresh.match(/\./g) || []).length === 2,
  );

  // Validate moderator summary information
  const moderator = authorized.moderator;
  TestValidator.predicate(
    "moderator ID in summary should match authorized response ID",
    moderator.id === authorized.id,
  );

  TestValidator.predicate(
    "moderator display name should be present",
    moderator.display_name !== undefined && moderator.display_name.length > 0,
  );

  TestValidator.predicate(
    "moderator account status should be active for authenticated session",
    moderator.account_status === "active",
  );

  // Verify display name is within valid length constraints
  TestValidator.predicate(
    "moderator display name length should be between 1-50 characters",
    moderator.display_name.length >= 1 && moderator.display_name.length <= 50,
  );
}
