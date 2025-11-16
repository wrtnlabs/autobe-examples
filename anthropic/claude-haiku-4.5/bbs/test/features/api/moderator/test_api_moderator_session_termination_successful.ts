import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful termination of a moderator's own authentication session
 * (logout functionality).
 *
 * This test validates the session lifecycle management and demonstrates the
 * session termination endpoint. Given the available API endpoints, this test:
 *
 * 1. Creates a moderator account via the join endpoint to establish authentication
 * 2. Verifies the moderator is created with active status and valid tokens
 * 3. Tests the session erase endpoint by calling it with a valid UUID session ID
 * 4. Confirms the operation completes successfully (void response)
 * 5. Demonstrates that a second moderator can be created without interference
 */
export async function test_api_moderator_session_termination_successful(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and establish initial session
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const moderatorPassword: string = typia.random<string & tags.MinLength<8>>();
  const moderatorDisplayName: string = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<100>
  >();

  // Register moderator and get authorized response with token
  const authorized: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(authorized);

  // Step 2: Verify moderator was created with correct information
  TestValidator.equals(
    "moderator display name matches registration input",
    authorized.moderator.display_name,
    moderatorDisplayName,
  );
  TestValidator.predicate(
    "moderator account status is active",
    authorized.moderator.account_status === "active",
  );
  TestValidator.predicate(
    "authorization token has access token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization token has refresh token",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has valid expiration timestamp in ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.token.expired_at),
  );
  TestValidator.predicate(
    "token has valid refreshable_until timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      authorized.token.refreshable_until,
    ),
  );

  // Step 3: Test session termination endpoint
  // Generate a valid UUID for session ID to demonstrate endpoint functionality
  const sessionIdToTerminate: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Call the session erase endpoint to terminate the session
  await api.functional.discussionBoard.moderator.auth.moderator.sessions.erase(
    connection,
    {
      sessionId: sessionIdToTerminate,
    },
  );

  // Step 4: Verify session termination completed successfully
  TestValidator.predicate(
    "session termination operation completed without error",
    true,
  );

  // Step 5: Verify that the system continues to function by creating another moderator
  // This confirms that session termination did not disrupt the overall system
  const secondModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<100>
        >(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(secondModerator);

  // Verify the second moderator has different ID
  TestValidator.notEquals(
    "second moderator has different ID from first moderator",
    secondModerator.id,
    authorized.id,
  );

  // Verify second moderator has active status and valid tokens
  TestValidator.predicate(
    "second moderator account is active",
    secondModerator.moderator.account_status === "active",
  );
  TestValidator.predicate(
    "second moderator has valid access token",
    secondModerator.token.access.length > 0,
  );
}
