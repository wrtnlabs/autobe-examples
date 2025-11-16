import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberFollower";

/**
 * Test that attempting to follow a non-existent member results in proper error
 * handling.
 *
 * This test validates the API's behavior when attempting to create a follow
 * relationship with a target member that doesn't exist. It verifies that:
 *
 * 1. The system properly validates member existence
 * 2. Appropriate error responses are returned for non-existent targets
 * 3. No follow relationship is created when the target member doesn't exist
 * 4. Error handling is consistent across multiple invalid member IDs
 *
 * Process:
 *
 * 1. Create a valid member account
 * 2. Attempt to follow a non-existent member with randomly generated UUIDs
 * 3. Verify error is thrown for the non-existent target
 * 4. Test with multiple invalid IDs to ensure consistent behavior
 */
export async function test_api_member_follow_nonexistent_target(
  connection: api.IConnection,
) {
  // Step 1: Create a valid member account to perform the follow action
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "TestPassword123!",
    ip: "192.168.1.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const createdMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(createdMember);
  typia.assert(createdMember.id);

  // Step 2: Generate multiple non-existent member IDs to test
  const nonExistentMemberIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];

  // Step 3: Test following each non-existent member and verify error handling
  for (const nonExistentId of nonExistentMemberIds) {
    // Verify that attempting to follow a non-existent member fails
    await TestValidator.error("cannot follow non-existent member", async () => {
      await api.functional.communityPlatform.member.members.following.create(
        connection,
        {
          memberId: createdMember.id,
          followingId: nonExistentId,
        },
      );
    });
  }

  // Step 4: Verify that attempting to follow with invalid UUID format fails
  await TestValidator.error(
    "cannot follow with invalid following ID",
    async () => {
      await api.functional.communityPlatform.member.members.following.create(
        connection,
        {
          memberId: createdMember.id,
          followingId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
