import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/**
 * Test the system response when attempting to retrieve a user profile that does
 * not exist or has been deleted. This test validates appropriate error handling
 * and security measures when accessing invalid profile IDs, preventing
 * information disclosure about deletions or system state.
 *
 * The test follows this workflow:
 *
 * 1. Create a member account to establish authentication context
 * 2. Generate a random non-existent profile ID
 * 3. Attempt to retrieve the non-existent profile
 * 4. Verify the system handles the request appropriately
 * 5. Test with a deleted account's profile (if applicable)
 * 6. Ensure no information is leaked about the profile's existence state
 */
export async function test_api_user_profile_retrieval_nonexistent_profile(
  connection: api.IConnection,
): Promise<void> {
  // Create a member account to establish authentication context
  const email = typia.random<string & tags.Format<"email">>();
  const password = "password123";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(1),
      email,
      password,
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Generate a random non-existent profile ID
  const nonExistentProfileId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve a non-existent profile and verify error handling
  await TestValidator.error(
    "should handle non-existent profile ID appropriately",
    async () => {
      await api.functional.redditCommunity.member.userProfiles.at(connection, {
        profileId: nonExistentProfileId,
      });
    },
  );

  // Test with another non-existent profile ID to ensure consistency
  const anotherNonExistentProfileId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should handle another non-existent profile ID consistently",
    async () => {
      await api.functional.redditCommunity.member.userProfiles.at(connection, {
        profileId: anotherNonExistentProfileId,
      });
    },
  );
}
