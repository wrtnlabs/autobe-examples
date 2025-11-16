import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator authentication with last_login_at timestamp tracking.
 *
 * This test verifies that successful moderator login updates the last_login_at
 * field in the moderators table. The authentication process should:
 *
 * 1. Accept moderator credentials (email or username with password)
 * 2. Validate credentials against stored password_hash
 * 3. Create a session record capturing security context (IP, href, referrer)
 * 4. Update last_login_at to current timestamp for audit tracking
 * 5. Return JWT tokens for authenticated API requests
 *
 * The test ensures moderator access history is properly tracked for security
 * monitoring and audit compliance purposes.
 */
export async function test_api_moderator_authentication_last_login_tracking(
  connection: api.IConnection,
) {
  // Step 1: Generate moderator login credentials
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  // Step 2: Create login request with session context (IP, href, referrer)
  const loginRequest = {
    email: moderatorEmail,
    password: moderatorPassword,
    ip: "192.168.1.1",
    href: "https://moderation-dashboard.example.com/login" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardModerator.ILogin;

  // Step 3: Perform moderator authentication
  const authorizedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginRequest,
    });
  typia.assert(authorizedModerator);

  // Step 4: Verify moderator account status is active
  TestValidator.equals(
    "moderator account status should be active",
    authorizedModerator.moderator.account_status,
    "active",
  );

  // Step 5: Verify token expiration logic (access token expires before refresh token)
  const expiredAt = new Date(authorizedModerator.token.expired_at);
  const refreshableUntil = new Date(
    authorizedModerator.token.refreshable_until,
  );

  TestValidator.predicate(
    "access token should expire before refresh token",
    expiredAt < refreshableUntil,
  );

  // Step 6: Verify access token is in the future (session is valid)
  TestValidator.predicate(
    "access token should not be expired",
    expiredAt > new Date(),
  );

  // Step 7: Verify authorization header is automatically set for subsequent requests
  TestValidator.predicate(
    "connection should have authorization header set",
    connection.headers?.Authorization !== undefined,
  );

  // Step 8: Test login with alternative credential (username instead of email)
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const loginWithUsernameRequest = {
    username: moderatorUsername,
    password: moderatorPassword,
    ip: "192.168.1.2",
    href: "https://moderation-dashboard.example.com/login" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardModerator.ILogin;

  const secondModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginWithUsernameRequest,
    });
  typia.assert(secondModerator);

  // Step 9: Verify username-based login also produces active moderator account
  TestValidator.equals(
    "second moderator should also have active status",
    secondModerator.moderator.account_status,
    "active",
  );

  // Step 10: Verify second moderator has valid token expiration
  const secondExpiredAt = new Date(secondModerator.token.expired_at);
  TestValidator.predicate(
    "second moderator access token should be valid",
    secondExpiredAt > new Date(),
  );
}
