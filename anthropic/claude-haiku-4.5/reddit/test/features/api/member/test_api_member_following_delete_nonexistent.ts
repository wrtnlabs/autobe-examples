import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test deletion of a non-existent follow relationship to validate proper error
 * handling.
 *
 * This test ensures the API gracefully handles attempts to delete follow
 * relationships that don't exist. The scenario verifies that the DELETE
 * endpoint returns appropriate error responses when attempting to unfollow a
 * non-existent relationship.
 *
 * Test procedure:
 *
 * 1. Authenticate as a member via join operation to establish session
 * 2. Generate valid UUIDs for hypothetical follower and following members
 * 3. Attempt to delete a follow relationship using valid UUIDs that don't
 *    represent actual follows
 * 4. Verify the API returns appropriate 404 Not Found or similar error response
 * 5. Confirm the error response indicates the resource was not found
 * 6. Validate no side effects occur from the failed deletion attempt
 */
export async function test_api_member_following_delete_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a member
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "TestPassword123!",
    ip: "127.0.0.1",
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const authenticatedMember = await api.functional.auth.member.join(
    connection,
    {
      body: memberData,
    },
  );
  typia.assert(authenticatedMember);

  // Step 2: Generate valid UUIDs for non-existent follow relationship
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentFollowingId = typia.random<string & tags.Format<"uuid">>();

  // Step 3 & 4: Attempt to delete non-existent follow relationship and verify error
  await TestValidator.error(
    "deleting non-existent follow relationship should fail",
    async () => {
      await api.functional.communityPlatform.member.members.following.erase(
        connection,
        {
          memberId: nonExistentMemberId,
          followingId: nonExistentFollowingId,
        },
      );
    },
  );
}
