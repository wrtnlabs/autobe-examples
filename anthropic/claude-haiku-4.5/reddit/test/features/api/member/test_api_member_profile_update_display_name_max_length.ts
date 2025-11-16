import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberProfile";

/**
 * Test display name field update at maximum allowed length (100 characters).
 *
 * This test validates the boundary condition for display_name field validation
 * by setting a member's display name to exactly 100 characters (the maximum
 * allowed length). The test ensures:
 *
 * 1. Member account creation and authentication
 * 2. Profile update with maximum-length display name (100 characters)
 * 3. Successful persistence of the full 100-character display name
 * 4. Verification that display name is returned without truncation
 * 5. Boundary condition validation at the upper limit
 *
 * Steps:
 *
 * 1. Create a new member account via registration
 * 2. Generate a 100-character display name string
 * 3. Update the member's profile with the maximum-length display name
 * 4. Verify the profile update succeeds
 * 5. Confirm the returned profile contains the full 100-character display name
 * 6. Validate that no truncation or modification occurred
 */
export async function test_api_member_profile_update_display_name_max_length(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(5);
  const password = "TestPassword123!";

  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email,
      username,
      password,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(authorized);

  const memberId = authorized.id;
  TestValidator.equals(
    "member created successfully",
    typeof memberId,
    "string",
  );

  // Step 2: Generate a 100-character display name
  // Create a display name with exactly 100 characters
  const maxLengthDisplayName = RandomGenerator.alphabets(100);
  TestValidator.equals(
    "display name has exactly 100 characters",
    maxLengthDisplayName.length,
    100,
  );

  // Step 3: Update the member's profile with the maximum-length display name
  const updatedProfile =
    await api.functional.communityPlatform.member.members.profiles.update(
      connection,
      {
        memberId,
        body: {
          display_name: maxLengthDisplayName,
        } satisfies ICommunityPlatformMemberProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);

  // Step 4: Verify the profile update was successful
  TestValidator.equals(
    "profile update returned correct member ID",
    updatedProfile.community_platform_member_id,
    memberId,
  );

  // Step 5: Confirm the display name persists without truncation
  TestValidator.equals(
    "display name persisted with full 100 characters",
    updatedProfile.display_name,
    maxLengthDisplayName,
  );

  // Step 6: Validate display name length
  TestValidator.equals(
    "updated display name has exactly 100 characters",
    updatedProfile.display_name?.length,
    100,
  );

  TestValidator.predicate(
    "display name is not truncated",
    updatedProfile.display_name === maxLengthDisplayName,
  );
}
