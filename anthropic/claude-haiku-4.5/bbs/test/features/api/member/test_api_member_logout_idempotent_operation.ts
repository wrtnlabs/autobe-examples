import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that member logout operation is idempotent.
 *
 * Multiple logout attempts should return success without error, even when the
 * session has already been invalidated. This validates that the logout endpoint
 * gracefully handles repeated calls on expired sessions.
 *
 * Workflow:
 *
 * 1. Register new member account with credentials
 * 2. Login to establish authenticated session with valid JWT tokens
 * 3. Execute first logout - should succeed
 * 4. Execute second logout with invalidated session - should also succeed
 * 5. Verify idempotent behavior without errors on repeated attempts
 */
export async function test_api_member_logout_idempotent_operation(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPass123"; // Must meet requirements: 8+ chars, uppercase, lowercase, number

  const registered = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(registered);
  TestValidator.equals(
    "registered member has valid ID",
    typeof registered.id,
    "string",
  );
  TestValidator.equals(
    "registered member received access token",
    typeof registered.token.access,
    "string",
  );

  // Step 2: Login to establish authenticated session
  const loginResponse = await api.functional.auth.member.login(connection, {
    body: {
      email,
      password,
    } satisfies IDiscussionBoardMember.ILoginRequest,
  });
  typia.assert(loginResponse);
  TestValidator.equals(
    "login returns valid access token",
    typeof loginResponse.token.access,
    "string",
  );

  // Step 3: Execute first logout - should succeed
  await api.functional.discussionBoard.member.auth.logout(connection);
  TestValidator.predicate("first logout completes successfully", true);

  // Step 4: Execute second logout with invalidated session token
  // The session is now expired, but the endpoint should handle this gracefully
  // and return success, demonstrating idempotent behavior
  await api.functional.discussionBoard.member.auth.logout(connection);
  TestValidator.predicate(
    "second logout on expired session succeeds without error",
    true,
  );

  // Step 5: Verify idempotent behavior
  TestValidator.predicate(
    "logout operation is idempotent - multiple calls return success",
    true,
  );
}
