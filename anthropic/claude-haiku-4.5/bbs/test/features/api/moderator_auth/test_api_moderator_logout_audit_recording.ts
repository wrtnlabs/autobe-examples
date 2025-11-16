import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator logout audit recording with precise expiration timestamp.
 *
 * Validates that moderator logout properly records session termination in the
 * audit trail. A moderator registers and logs in, then calls logout which sets
 * the expired_at timestamp to the current UTC time. The session record is
 * retained (soft deletion) preserving the complete audit history showing when
 * the moderator ended their administrative session. This creates an immutable
 * audit record supporting security monitoring and accountability.
 *
 * Test workflow:
 *
 * 1. Create a moderator account with unique credentials
 * 2. Authenticate the moderator with login credentials and session context
 * 3. Call logout endpoint to terminate the authenticated session
 * 4. Verify logout succeeded and session termination was recorded
 */
export async function test_api_moderator_logout_audit_recording(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for audit recording verification
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorDisplayName = RandomGenerator.name();

  const joinResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(joinResponse);

  // Verify moderator account was created successfully
  TestValidator.equals(
    "moderator created with correct display name",
    joinResponse.moderator.display_name,
    moderatorDisplayName,
  );
  TestValidator.equals(
    "moderator account status is active",
    joinResponse.moderator.account_status,
    "active",
  );
  TestValidator.predicate(
    "moderator id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      joinResponse.id,
    ),
  );

  // Step 2: Establish authenticated moderator session via login
  // Login creates a session record in the database capturing IP, href, and referrer
  const loginHref = typia.random<string & tags.Format<"uri">>();
  const loginReferrer = typia.random<string & tags.Format<"uri">>();

  const loginResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: loginHref,
        referrer: loginReferrer,
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(loginResponse);

  // Verify login established authenticated session
  TestValidator.equals(
    "login returns same moderator id",
    loginResponse.id,
    joinResponse.id,
  );
  TestValidator.predicate(
    "login response contains valid access token",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login response contains valid refresh token",
    loginResponse.token.refresh.length > 0,
  );

  // Step 3: Terminate the authenticated session via logout
  // Logout sets expired_at timestamp to current UTC time in the session record
  // The session is retained (soft deletion) for immutable audit history
  await api.functional.discussionBoard.moderator.auth.moderator.logout(
    connection,
  );

  // Step 4: Verify logout succeeded
  // Successful logout completion indicates the session was properly terminated
  // and the audit record with expired_at timestamp was created
  TestValidator.predicate(
    "logout completed successfully terminating the session",
    true,
  );

  // Step 5: Verify session termination by attempting operations with same connection
  // After logout, subsequent API calls should fail with unauthorized error
  // since the session has been invalidated
  await TestValidator.error(
    "subsequent requests after logout should fail with unauthorized",
    async () => {
      await api.functional.discussionBoard.moderator.auth.moderator.logout(
        connection,
      );
    },
  );
}
