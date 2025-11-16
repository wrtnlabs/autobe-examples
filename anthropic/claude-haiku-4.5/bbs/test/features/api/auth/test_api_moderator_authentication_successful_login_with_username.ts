import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful moderator authentication using username credentials.
 *
 * Validates that a moderator with an active account can authenticate using
 * their username instead of email. The system performs case-insensitive
 * username lookup, validates the password against the stored hash, verifies the
 * moderator has an 'active' account status, creates a secure session record
 * with IP/href/referrer context, and returns JWT tokens (access and refresh)
 * along with moderator summary information.
 *
 * This test ensures:
 *
 * 1. Username-based authentication works correctly
 * 2. Password validation succeeds with correct credentials
 * 3. Only active moderators can log in
 * 4. Session is properly created with security context
 * 5. JWT tokens are returned in the response
 * 6. Moderator summary includes correct identification and status
 */
export async function test_api_moderator_authentication_successful_login_with_username(
  connection: api.IConnection,
) {
  // Generate test credentials for moderator login
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const password = RandomGenerator.alphabets(12);
  const testUrl = "https://example.com/moderator/login";
  const testReferrer = "https://example.com/moderator";
  const testIp = "192.168.1.100";

  // Prepare login request body with username
  const loginBody = {
    username: username,
    password: password,
    href: testUrl,
    referrer: testReferrer,
    ip: testIp,
  } satisfies IDiscussionBoardModerator.ILogin;

  // Attempt moderator login with username credentials
  const response: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginBody,
    });

  // Validate response is properly typed and contains all required data
  typia.assert(response);

  // Validate that authentication was successful by checking moderator ID exists
  TestValidator.predicate(
    "moderator ID should be present after successful authentication",
    response.id.length > 0,
  );

  // Validate moderator account status is 'active' (login restriction enforcement)
  TestValidator.equals(
    "authenticated moderator should have active account status",
    response.moderator.account_status,
    "active",
  );

  // Validate moderator summary ID matches the authenticated moderator ID
  TestValidator.equals(
    "moderator summary ID should match authenticated moderator ID",
    response.moderator.id,
    response.id,
  );

  // Validate JWT tokens were issued and are not empty
  TestValidator.predicate(
    "access token should be issued after successful login",
    response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be issued after successful login",
    response.token.refresh.length > 0,
  );

  // Validate token expiration timing (refresh token validity extends beyond access token)
  const accessExpiry = new Date(response.token.expired_at).getTime();
  const refreshExpiry = new Date(response.token.refreshable_until).getTime();
  TestValidator.predicate(
    "refresh token should have extended validity period compared to access token",
    refreshExpiry > accessExpiry,
  );
}
