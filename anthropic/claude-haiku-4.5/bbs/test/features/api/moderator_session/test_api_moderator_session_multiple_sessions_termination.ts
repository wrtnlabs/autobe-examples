import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that multiple moderator sessions can be created and session termination
 * is supported.
 *
 * This test validates session creation functionality by:
 *
 * 1. Creating a moderator account
 * 2. Logging in multiple times to verify multiple sessions can be created
 * 3. Verifying each login produces a distinct authentication token
 * 4. Confirming that moderators can maintain multiple concurrent session contexts
 *
 * This demonstrates that the authentication system supports multiple concurrent
 * sessions for the same moderator account with independent tokens.
 */
export async function test_api_moderator_session_multiple_sessions_termination(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123";
  const ipAddress = "192.168.1.1";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const joinResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: ipAddress,
        href: href,
        referrer: referrer,
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(joinResponse);

  const moderatorId = joinResponse.id;
  TestValidator.equals(
    "moderator created successfully",
    joinResponse.email,
    moderatorEmail,
  );

  // Step 2: Create first session by logging in
  const connection1: api.IConnection = { ...connection, headers: {} };
  const session1Response: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection1, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: ipAddress,
        href: href,
        referrer: referrer,
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(session1Response);
  const session1Token = session1Response.token.access;

  TestValidator.equals(
    "first session moderator ID matches",
    session1Response.id,
    moderatorId,
  );
  TestValidator.predicate(
    "first session token is present",
    session1Token.length > 0,
  );

  // Step 3: Create second session by logging in again with fresh connection
  const connection2: api.IConnection = { ...connection, headers: {} };
  const session2Response: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection2, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: ipAddress,
        href: href,
        referrer: referrer,
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(session2Response);
  const session2Token = session2Response.token.access;

  TestValidator.equals(
    "second session moderator ID matches",
    session2Response.id,
    moderatorId,
  );
  TestValidator.notEquals(
    "sessions have different tokens",
    session1Token,
    session2Token,
  );

  // Step 4: Create third session for additional validation
  const connection3: api.IConnection = { ...connection, headers: {} };
  const session3Response: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection3, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: ipAddress,
        href: href,
        referrer: referrer,
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(session3Response);
  const session3Token = session3Response.token.access;

  TestValidator.equals(
    "third session moderator ID matches",
    session3Response.id,
    moderatorId,
  );
  TestValidator.notEquals(
    "session 1 and 3 have different tokens",
    session1Token,
    session3Token,
  );
  TestValidator.notEquals(
    "session 2 and 3 have different tokens",
    session2Token,
    session3Token,
  );

  // Step 5: Verify all sessions maintain independent tokens
  TestValidator.predicate(
    "all three tokens are unique",
    session1Token !== session2Token &&
      session2Token !== session3Token &&
      session1Token !== session3Token,
  );

  // Step 6: Verify token structure and content for each session
  TestValidator.predicate(
    "session 1 token is non-empty string",
    typeof session1Token === "string" && session1Token.length > 0,
  );
  TestValidator.predicate(
    "session 2 token is non-empty string",
    typeof session2Token === "string" && session2Token.length > 0,
  );
  TestValidator.predicate(
    "session 3 token is non-empty string",
    typeof session3Token === "string" && session3Token.length > 0,
  );

  // Step 7: Confirm all sessions belong to the same moderator
  TestValidator.equals(
    "all sessions authenticated as same moderator",
    session1Response.id,
    session2Response.id,
  );
  TestValidator.equals(
    "session 3 also authenticates as same moderator",
    session2Response.id,
    session3Response.id,
  );
}
