import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberFollower";

/**
 * Test following behavior when the target member (followingId) does not exist.
 *
 * This test validates that the system properly handles attempts to follow a
 * non-existent member. A follower member is created and attempts to follow a
 * member ID that does not correspond to any existing member account. The system
 * should reject this request with an appropriate not found error, preventing
 * the creation of orphaned follow relationships that would reference deleted or
 * non-existent members.
 *
 * Test flow:
 *
 * 1. Create a valid member account to act as the follower
 * 2. Attempt to follow a non-existent member using a valid UUID format
 * 3. Verify the API returns an error (404/not found)
 * 4. Confirm no orphaned follow record is created
 */
export async function test_api_member_following_nonexistent_target(
  connection: api.IConnection,
) {
  // Step 1: Create a member account that will act as the follower
  const followerMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "SecurePassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(followerMember);

  // Step 2: Generate a non-existent member ID (valid UUID format but no corresponding member)
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to follow the non-existent member and verify error handling
  await TestValidator.error(
    "following non-existent member should fail",
    async () => {
      await api.functional.communityPlatform.member.members.following.create(
        connection,
        {
          memberId: followerMember.id,
          followingId: nonExistentMemberId,
        },
      );
    },
  );
}
