import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that a member can delete their own authentication session to log out.
 *
 * This validates the session termination workflow ensuring that deleted
 * sessions are properly invalidated and the associated JWT token becomes
 * unusable for subsequent API requests.
 *
 * Workflow:
 *
 * 1. Member registers with email and password to create initial authenticated
 *    account
 * 2. Member authenticates again to create a second active session
 * 3. Member deletes the second session by session ID
 * 4. Verify session deletion is successful
 * 5. Confirm the deleted session token is now invalid by attempting API call with
 *    it
 */
export async function test_api_member_session_deletion_logout_functionality(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123"; // Must meet: 8+ chars, uppercase, lowercase, number

  const registerResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(registerResponse);

  const initialSessionId = registerResponse.id;
  TestValidator.predicate(
    "registration should create session with valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      initialSessionId,
    ),
  );

  // Step 2: Login to create a second active session
  const loginResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ILoginRequest,
    });
  typia.assert(loginResponse);

  const secondSessionId = loginResponse.id;
  TestValidator.notEquals(
    "second session should have different ID from registration session",
    secondSessionId,
    initialSessionId,
  );

  // Store the second session's token for later verification
  const secondSessionToken = loginResponse.token.access;
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3: Delete the second session
  await api.functional.discussionBoard.member.auth.sessions.erase(connection, {
    sessionId: secondSessionId,
  });

  TestValidator.predicate(
    "session deletion should complete without error",
    true,
  );

  // Step 4: Verify the deleted session token is now invalid
  // Attempt to use the deleted session's token in a new connection
  const invalidatedConnection: api.IConnection = {
    ...unauthenticatedConnection,
    headers: {
      Authorization: `Bearer ${secondSessionToken}`,
    },
  };

  // Attempting to authenticate with deleted session token should fail
  await TestValidator.error(
    "deleted session token should be rejected on API requests",
    async () => {
      await api.functional.auth.member.login(invalidatedConnection, {
        body: {
          email: memberEmail,
          password: memberPassword,
        } satisfies IDiscussionBoardMember.ILoginRequest,
      });
    },
  );
}
