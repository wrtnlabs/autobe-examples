import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator authentication with session context tracking.
 *
 * Validates that session context (href and referrer URLs) is properly captured
 * during moderator authentication for audit trail and security tracking
 * purposes. The test verifies that moderator login with valid credentials and
 * session context returns proper JWT tokens and that the authentication is
 * tracked appropriately.
 *
 * Process:
 *
 * 1. Generate valid moderator email and password credentials
 * 2. Create session context data with mandatory href and referrer URLs
 * 3. Optionally include client IP address for additional context
 * 4. Call moderator login API with authentication credentials and session context
 * 5. Verify authenticated response with moderator details and JWT tokens
 * 6. Validate token information for subsequent authenticated requests
 * 7. Confirm access token is automatically set in connection headers
 */
export async function test_api_moderator_authentication_session_context_tracking(
  connection: api.IConnection,
) {
  // Generate valid moderator credentials with proper email format
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  // Create session context with mandatory href and referrer URLs
  const sessionContextLogin = {
    email: moderatorEmail,
    password: moderatorPassword,
    // Mandatory session context fields for audit trail
    href: "https://example.com/moderator/login" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com/moderator" satisfies string &
      tags.Format<"uri">,
    // Optional IP address for SSR scenarios
    ip: "192.168.1.100",
  } satisfies IDiscussionBoardModerator.ILogin;

  // Authenticate moderator with session context
  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: sessionContextLogin,
    });

  // Verify authenticated response structure and all properties
  typia.assert(authenticatedModerator);

  // Validate JWT token information for authenticated access
  TestValidator.predicate(
    "access token should be non-empty string",
    authenticatedModerator.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be non-empty string",
    authenticatedModerator.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "access token expiration should be in future",
    new Date(authenticatedModerator.token.expired_at) > new Date(),
  );

  TestValidator.predicate(
    "refresh token expiration should be in future",
    new Date(authenticatedModerator.token.refreshable_until) > new Date(),
  );

  TestValidator.predicate(
    "refresh token expiration should be after access token expiration",
    new Date(authenticatedModerator.token.refreshable_until) >=
      new Date(authenticatedModerator.token.expired_at),
  );

  // Verify connection headers are updated with access token for authenticated requests
  TestValidator.equals(
    "connection should have authorization header set with access token",
    connection.headers?.Authorization,
    authenticatedModerator.token.access,
  );
}
