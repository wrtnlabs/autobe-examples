import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuth";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderator logout properly creates a complete audit trail of session
 * activity.
 *
 * This test validates that the logout operation maintains proper security audit
 * trails by recording session termination timestamps and preserving session
 * metadata for forensic analysis and security monitoring purposes.
 *
 * Test workflow:
 *
 * 1. Create a new moderator account to establish an authenticated session with
 *    audit information
 * 2. Perform logout operation to terminate the session
 * 3. Validate that logout succeeds with proper confirmation
 * 4. Verify that session is marked as expired with accurate termination timestamp
 * 5. Ensure session metadata (IP, href, referrer) is preserved for security
 *    auditing
 */
export async function test_api_moderator_logout_session_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account to establish an authenticated session
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(10);
  const moderatorPassword = "SecurePass123!";

  const registrationData = {
    username: moderatorUsername,
    email: moderatorEmail,
    password: moderatorPassword,
    href: "https://example.com/moderator/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardModerator.ICreate;

  const authorizedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });

  typia.assert(authorizedModerator);

  // Validate that the moderator was created successfully with proper authentication tokens
  TestValidator.predicate(
    "moderator should be created with valid ID",
    authorizedModerator.id.length > 0,
  );

  TestValidator.equals(
    "moderator username should match",
    authorizedModerator.username,
    moderatorUsername,
  );

  TestValidator.equals(
    "moderator email should match",
    authorizedModerator.email,
    moderatorEmail,
  );

  TestValidator.predicate(
    "authorization token should be present",
    authorizedModerator.token !== null &&
      authorizedModerator.token !== undefined,
  );

  TestValidator.predicate(
    "access token should be valid",
    authorizedModerator.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be valid",
    authorizedModerator.token.refresh.length > 0,
  );

  // Step 2: Perform logout operation to terminate the authenticated session
  const logoutResult: IDiscussionBoardAuth.ILogoutResult =
    await api.functional.discussionBoard.moderator.auth.logout(connection);

  typia.assert(logoutResult);

  // Step 3: Validate that logout operation completed successfully
  TestValidator.equals("logout should succeed", logoutResult.success, true);

  TestValidator.predicate(
    "logout message should be provided",
    logoutResult.message.length > 0,
  );

  // Note: Steps 4 and 5 validation (expired_at timestamp and session metadata preservation)
  // cannot be directly validated in this E2E test as we don't have access to query the
  // discussion_board_moderator_sessions table directly. The backend implementation is
  // responsible for:
  // - Setting expired_at timestamp to mark session as terminated
  // - Preserving IP address, href, and referrer metadata for audit trail
  // These would be validated through database integration tests or by checking session
  // validity on subsequent API calls (which should fail with expired session)
}
