import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that attempting to delete a member session with a non-existent session
 * ID returns an appropriate error response.
 *
 * This test validates error handling when attempting to delete a session that
 * does not exist. The session ID must be in valid UUID format (required by the
 * API), but the session should not exist in the system.
 *
 * The test ensures:
 *
 * - The API properly rejects deletion requests for non-existent sessions
 * - Error responses are returned appropriately
 * - System maintains stability when attempting invalid operations
 * - Proper validation and error handling for session deletion
 *
 * Test workflow:
 *
 * 1. Create a member account and establish authentication
 * 2. Attempt to delete a session using a valid UUID format but non-existent
 *    session ID
 * 3. Verify that an error response is returned for the non-existent session
 */
export async function test_api_member_session_delete_with_invalid_session_id(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication context
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUsername: string = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const memberDisplayName: string = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<50>
  >();
  const memberPassword: string = typia.random<string & tags.MinLength<8>>();

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        display_name: memberDisplayName,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);
  typia.assert(member.token);

  // Step 2: Test deletion with valid UUID format but non-existent session
  const nonExistentSessionId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should reject deletion with non-existent session ID",
    async () => {
      await api.functional.discussionBoard.member.auth.member.sessions.erase(
        connection,
        {
          sessionId: nonExistentSessionId,
        },
      );
    },
  );

  // Step 3: Test with multiple non-existent session IDs to ensure consistent error handling
  const additionalNonExistentIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  await ArrayUtil.asyncForEach(additionalNonExistentIds, async (sessionId) => {
    await TestValidator.error(
      `should reject deletion with another non-existent session ID`,
      async () => {
        await api.functional.discussionBoard.member.auth.member.sessions.erase(
          connection,
          {
            sessionId: sessionId,
          },
        );
      },
    );
  });
}
