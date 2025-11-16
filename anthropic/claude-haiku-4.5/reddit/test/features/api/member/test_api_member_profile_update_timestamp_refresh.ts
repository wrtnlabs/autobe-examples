import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberProfile";

/**
 * Test that the updated_at timestamp is automatically refreshed on profile
 * modification.
 *
 * This test validates the timestamp tracking functionality of the member
 * profile system. It creates a new member account, then updates the profile
 * with new display information. The test verifies that the updated_at timestamp
 * is newer than created_at, confirming that the system properly maintains
 * accurate audit timestamps when profile changes occur.
 *
 * Test workflow:
 *
 * 1. Register a new member account (creates profile with created_at timestamp)
 * 2. Wait briefly to ensure measurable time progression
 * 3. Update profile with new display name and bio
 * 4. Verify updated_at is newer than created_at
 * 5. Confirm profile modification is properly tracked with accurate timestamps
 */
export async function test_api_member_profile_update_timestamp_refresh(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const email = typia.random<string & tags.Format<"email">>();
  const joinResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: email,
      username: RandomGenerator.alphabets(10),
      password: "SecurePassword123!",
      href: typia.random<string & tags.Format<"uri">>().substring(0, 2048),
      referrer: typia.random<string & tags.Format<"uri">>().substring(0, 2048),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResponse);

  // Capture member ID
  const memberId = joinResponse.id;

  // Step 2: Wait a brief moment to ensure time progression
  // This ensures updated_at will be measurably different from created_at
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 3: Update profile with new information
  const displayName = RandomGenerator.name(2);
  const bio = RandomGenerator.paragraph({ sentences: 2 });

  const updateResponse =
    await api.functional.communityPlatform.member.members.profiles.update(
      connection,
      {
        memberId: memberId,
        body: {
          display_name: displayName,
          bio: bio,
        } satisfies ICommunityPlatformMemberProfile.IUpdate,
      },
    );
  typia.assert(updateResponse);

  // Step 4: Verify timestamps
  const createdAtTime = new Date(updateResponse.created_at).getTime();
  const updatedAtTime = new Date(updateResponse.updated_at).getTime();

  // Verify that updated_at is newer than created_at
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    updatedAtTime > createdAtTime,
  );

  // Step 5: Verify that profile data was actually updated
  TestValidator.equals(
    "display_name should match the updated value",
    updateResponse.display_name,
    displayName,
  );
  TestValidator.equals(
    "bio should match the updated value",
    updateResponse.bio,
    bio,
  );
}
