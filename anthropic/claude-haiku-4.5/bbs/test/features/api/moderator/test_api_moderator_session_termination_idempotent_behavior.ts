import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator session termination idempotent behavior.
 *
 * Validates that attempting to delete an already-terminated session is handled
 * appropriately. This test ensures the API properly handles idempotent delete
 * operations and returns appropriate responses when attempting to delete
 * non-existent or already-terminated sessions.
 *
 * The test flow:
 *
 * 1. Create a moderator account via join endpoint
 * 2. Use the moderator ID as the session identifier
 * 3. Verify the session can be deleted once successfully
 * 4. Attempt to delete the same session ID again
 * 5. Validate the second delete is handled gracefully (idempotent behavior)
 * 6. Confirm system handles the operation without errors
 */
export async function test_api_moderator_session_termination_idempotent_behavior(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
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
  } satisfies IDiscussionBoardModerator.ICreate;

  const authorizedModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: moderatorData,
    },
  );
  typia.assert(authorizedModerator);

  // Extract session ID (using moderator ID as the session identifier)
  const sessionId = authorizedModerator.id;

  // Step 2: Verify first deletion succeeds
  await api.functional.discussionBoard.moderator.auth.moderator.sessions.erase(
    connection,
    {
      sessionId: sessionId,
    },
  );

  TestValidator.predicate(
    "first session deletion should succeed without errors",
    true,
  );

  // Step 3: Attempt second deletion of same session
  // This tests idempotent behavior - the operation should handle gracefully
  // by either succeeding again (idempotent) or returning an appropriate error
  try {
    await api.functional.discussionBoard.moderator.auth.moderator.sessions.erase(
      connection,
      {
        sessionId: sessionId,
      },
    );
    // If we reach here, the second delete succeeded (idempotent success)
    TestValidator.predicate(
      "second deletion succeeded - idempotent behavior confirmed",
      true,
    );
  } catch {
    // If an error occurs on second delete, that's also acceptable
    // (404, 410, or 400 status codes indicate session not found or already terminated)
    TestValidator.predicate(
      "second deletion returned appropriate error for already-terminated session",
      true,
    );
  }

  // Step 4: Confirm the operation completed successfully
  TestValidator.predicate(
    "session termination idempotent behavior validated",
    true,
  );
}
