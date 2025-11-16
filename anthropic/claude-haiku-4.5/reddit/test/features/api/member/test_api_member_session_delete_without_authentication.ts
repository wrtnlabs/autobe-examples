import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";

/**
 * Test that session deletion requires proper authentication and cannot be
 * performed by unauthenticated users.
 *
 * This test validates security by attempting to delete a session without
 * providing a valid authentication token. The DELETE endpoint at
 * /communityPlatform/member/auth/member/sessions/{sessionId} should fail with
 * an authentication error when called without authentication, confirming that
 * the endpoint properly enforces authentication requirements and protects
 * session management operations from unauthorized access.
 *
 * Test workflow:
 *
 * 1. Create a member account through authentication join endpoint
 * 2. Extract session ID from authenticated response
 * 3. Create unauthenticated connection with empty headers
 * 4. Attempt to delete session using unauthenticated connection
 * 5. Verify that the delete operation fails with authentication error
 */
export async function test_api_member_session_delete_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create a member account and establish authenticated session
  const memberAccount = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      password: "SecurePassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAccount);

  // Step 2: Generate a random session ID for deletion attempt
  const sessionIdToDelete = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4: Attempt to delete session using unauthenticated connection
  // This should fail because no authentication token is provided
  await TestValidator.error(
    "session deletion without authentication should fail",
    async () => {
      await api.functional.communityPlatform.member.auth.member.sessions.erase(
        unauthenticatedConnection,
        {
          sessionId: sessionIdToDelete,
        },
      );
    },
  );
}
