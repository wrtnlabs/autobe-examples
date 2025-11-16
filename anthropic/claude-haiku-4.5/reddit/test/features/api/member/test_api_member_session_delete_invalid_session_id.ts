import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";

/**
 * Validates error handling when deleting a session with invalid session ID.
 *
 * This test verifies that the API properly handles attempts to delete sessions
 * that do not exist. It creates a member account through registration to
 * establish authentication context, then attempts to delete a session using a
 * non-existent UUID. The operation should fail with an appropriate error
 * response.
 *
 * The test validates:
 *
 * 1. Member registration and authentication context establishment
 * 2. Error handling when deleting with a non-existent session ID
 * 3. Proper error response indicating session not found
 */
export async function test_api_member_session_delete_invalid_session_id(
  connection: api.IConnection,
) {
  // Create a member account through registration
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
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
  typia.assert(member);

  // Attempt to delete a non-existent session with invalid UUID
  const invalidSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should fail when deleting non-existent session",
    async () => {
      await api.functional.communityPlatform.member.auth.member.sessions.erase(
        connection,
        {
          sessionId: invalidSessionId,
        },
      );
    },
  );
}
