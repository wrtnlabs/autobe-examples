import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test session deletion behavior when attempting to delete a non-existent
 * session ID.
 *
 * This test validates error handling for invalid session references by creating
 * a member account, then attempting to delete a session using a valid UUID
 * format that doesn't correspond to any existing session in the database.
 *
 * Test workflow:
 *
 * 1. Create a new member account via join operation
 * 2. Generate a valid UUID format that does not correspond to any existing session
 * 3. Attempt to delete the non-existent session
 * 4. Verify appropriate error response (404 Not Found expected)
 */
export async function test_api_member_session_deletion_nonexistent_session(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to establish authentication context
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Generate a valid UUID that does not correspond to any existing session
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to delete the non-existent session and verify error response
  await TestValidator.error(
    "deleting non-existent session should fail with error",
    async () => {
      await api.functional.redditCommunity.member.members.sessions.erase(
        connection,
        {
          username: member.username,
          sessionId: nonExistentSessionId,
        },
      );
    },
  );
}
