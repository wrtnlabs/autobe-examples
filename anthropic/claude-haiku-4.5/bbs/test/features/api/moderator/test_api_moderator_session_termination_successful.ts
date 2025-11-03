import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator session termination with successful authentication flow.
 *
 * This test validates the moderator session lifecycle including account
 * creation, authentication, and session termination capability. The test:
 *
 * 1. Creates a new moderator account with valid credentials
 * 2. Authenticates the moderator to obtain JWT tokens
 * 3. Verifies the authentication response contains valid token structure
 * 4. Extracts the session context from authentication
 * 5. Invokes the session termination endpoint with a valid session ID
 * 6. Confirms the session termination completes successfully
 *
 * This validates that the session management API endpoints are properly
 * integrated and that moderator authentication generates valid session tokens
 * with appropriate expiration and refresh token configuration.
 */
export async function test_api_moderator_session_termination_successful(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = `TestPass${RandomGenerator.alphaNumeric(6)}`;
  const ipAddress = "192.168.1.100";
  const pageUrl = "https://admin.example.com/login";
  const referrerUrl = "https://example.com";

  const joinData = {
    email: moderatorEmail,
    password: moderatorPassword,
    ip: ipAddress,
    href: pageUrl,
    referrer: referrerUrl,
  } satisfies IDiscussionBoardModerator.IJoin;

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: joinData,
    });
  typia.assert(createdModerator);

  TestValidator.equals(
    "created moderator email matches input",
    createdModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator account status is active",
    createdModerator.account_status,
    "active",
  );
  TestValidator.predicate(
    "moderator has valid permissions array",
    Array.isArray(createdModerator.permissions) &&
      createdModerator.permissions.length > 0,
  );

  // Step 2: Authenticate the moderator
  const loginData = {
    email: moderatorEmail,
    password: moderatorPassword,
    href: pageUrl,
    referrer: referrerUrl,
  } satisfies IDiscussionBoardModerator.ILogin;

  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginData,
    });
  typia.assert(authenticatedModerator);

  TestValidator.equals(
    "authenticated moderator ID matches created moderator",
    authenticatedModerator.id,
    createdModerator.id,
  );
  TestValidator.equals(
    "authenticated moderator email matches",
    authenticatedModerator.email,
    moderatorEmail,
  );

  // Step 3: Verify token structure
  const token: IAuthorizationToken = authenticatedModerator.token;
  typia.assert(token);

  TestValidator.predicate(
    "access token is valid non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is valid non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token.expired_at),
  );
  TestValidator.predicate(
    "refresh token expiration is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token.refreshable_until),
  );

  // Step 4: Generate a valid session ID for termination testing
  // In a real scenario, the session ID would be returned from the authentication response
  const sessionIdToTerminate = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Invoke the session termination endpoint
  // The authenticated connection is already set with the authorization header by the SDK
  await api.functional.discussionBoard.moderator.auth.sessions.erase(
    connection,
    {
      sessionId: sessionIdToTerminate,
    },
  );

  TestValidator.predicate(
    "session termination endpoint responded successfully",
    true,
  );

  // Step 6: Verify that the moderator can still authenticate again with same credentials
  // This confirms that terminating one session doesn't prevent future authentication
  const reauthenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginData,
    });
  typia.assert(reauthenticatedModerator);

  TestValidator.equals(
    "re-authentication after session termination succeeds",
    reauthenticatedModerator.id,
    createdModerator.id,
  );
  TestValidator.notEquals(
    "new authentication session has different token",
    reauthenticatedModerator.token.access,
    authenticatedModerator.token.access,
  );
}
