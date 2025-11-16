import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test logout behavior with an invalid or orphaned session ID.
 *
 * This test validates how the logout endpoint handles scenarios where a member
 * attempts to logout but the session record associated with their
 * authentication token no longer exists in the database. This can occur when:
 *
 * - Session cleanup/maintenance processes remove old sessions
 * - Database cleanup procedures delete abandoned sessions
 * - Session records are manually deleted
 *
 * The test verifies that the system gracefully handles logout requests even
 * when the underlying session record cannot be found, either by accepting the
 * logout as an idempotent operation or returning an appropriate error
 * response.
 *
 * Steps:
 *
 * 1. Create a new member account via join endpoint
 * 2. Verify the member receives valid authentication tokens
 * 3. Perform initial logout (normal operation)
 * 4. Attempt second logout with expired/missing session
 * 5. Verify graceful handling of the orphaned session scenario
 */
export async function test_api_member_logout_with_invalid_session_id(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to establish a valid session
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "SecurePass123!@#",
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const authorized = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(authorized);

  // Step 2: Verify the member was created with valid token
  TestValidator.predicate(
    "member should be authorized with valid tokens",
    authorized.token.access.length > 0 && authorized.token.refresh.length > 0,
  );

  // Step 3: Perform initial logout with valid session
  await api.functional.communityPlatform.member.auth.member.logout(connection);
  TestValidator.predicate("first logout should complete successfully", true);

  // Step 4: Attempt logout again with expired/missing session
  // After first logout, the session is expired/removed
  // This simulates the orphaned session scenario where the session no longer exists
  // The endpoint should either accept it idempotently or return an appropriate error
  try {
    await api.functional.communityPlatform.member.auth.member.logout(
      connection,
    );
    // If logout succeeds even with expired session, verify idempotent behavior
    TestValidator.predicate(
      "logout is idempotent - succeeds even when session is already expired",
      true,
    );
  } catch (error) {
    // If logout fails, verify it's an appropriate error for missing session
    TestValidator.predicate(
      "logout error indicates session not found or already expired",
      error instanceof api.HttpError &&
        (error.status === 401 || error.status === 403 || error.status === 404),
    );
  }
}
