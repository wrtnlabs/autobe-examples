import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberFollower";

/**
 * Test retrieval of followers for a member that doesn't exist.
 *
 * This test validates that the API properly handles requests for followers of
 * non-existent members by returning appropriate error responses.
 *
 * Test procedure:
 *
 * 1. Generate a valid UUID that doesn't correspond to any member
 * 2. Attempt to retrieve followers for the non-existent member
 * 3. Verify the API returns an error response
 * 4. Validate proper error handling and no information leakage
 */
export async function test_api_member_followers_nonexistent_member(
  connection: api.IConnection,
) {
  // Generate a valid UUID that doesn't exist in the system
  const nonexistentMemberId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve followers for non-existent member and expect error
  await TestValidator.error(
    "should return error for non-existent member followers",
    async () => {
      await api.functional.communityPlatform.members.followers.index(
        connection,
        {
          memberId: nonexistentMemberId,
        },
      );
    },
  );
}
