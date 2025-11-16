import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderator login properly captures and stores session metadata.
 *
 * This test validates that the authentication system correctly collects session
 * context information including IP address, connection URL (href), and referrer
 * during the login process. This metadata is essential for security audit
 * trails, suspicious activity detection, and user flow analysis.
 *
 * Test workflow:
 *
 * 1. Create a moderator account with initial session metadata
 * 2. Login with explicit session context fields (ip, href, referrer)
 * 3. Validate successful authentication with proper token response
 * 4. Ensure session metadata is captured during the login process
 */
export async function test_api_moderator_login_session_metadata_capture(
  connection: api.IConnection,
) {
  // Step 1: Generate moderator credentials and session metadata
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorUsername = RandomGenerator.name(2);

  const sessionIp = "192.168.1.100";
  const sessionHref = typia.random<string & tags.Format<"uri">>();
  const sessionReferrer = typia.random<string & tags.Format<"uri">>();

  // Step 2: Create moderator account with join endpoint
  const joinedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
        ip: sessionIp,
        href: sessionHref,
        referrer: sessionReferrer,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(joinedModerator);

  // Validate join response contains expected moderator information
  TestValidator.equals(
    "joined moderator email matches",
    joinedModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "joined moderator username matches",
    joinedModerator.username,
    moderatorUsername,
  );

  // Step 3: Login with explicit session metadata
  const loginSessionIp = "10.0.0.50";
  const loginSessionHref = typia.random<string & tags.Format<"uri">>();
  const loginSessionReferrer = typia.random<string & tags.Format<"uri">>();

  const loggedInModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: loginSessionIp,
        href: loginSessionHref,
        referrer: loginSessionReferrer,
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(loggedInModerator);

  // Step 4: Validate login response and session metadata capture
  TestValidator.equals(
    "logged in moderator ID matches",
    loggedInModerator.id,
    joinedModerator.id,
  );
  TestValidator.equals(
    "logged in moderator email matches",
    loggedInModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "logged in moderator username matches",
    loggedInModerator.username,
    moderatorUsername,
  );

  // Validate authorization tokens are present
  TestValidator.predicate(
    "access token is present",
    loggedInModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    loggedInModerator.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration is set",
    loggedInModerator.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh expiration is set",
    loggedInModerator.token.refreshable_until.length > 0,
  );
}
