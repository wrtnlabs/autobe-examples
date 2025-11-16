import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/**
 * Test creation of a minimal user profile with only the required display name
 * field.
 *
 * This test validates that members can establish basic profiles with minimal
 * information while ensuring functionality for community participation. The
 * process demonstrates quick profile setup for users preferring minimal initial
 * setup.
 *
 * 1. Register new member account as prerequisite
 * 2. Create minimal profile with only required display_name
 * 3. Validate profile creation success
 * 4. Confirm display_name matches input
 * 5. Verify optional fields are undefined/null for minimal profile
 */
export async function test_api_user_profile_creation_minimal_profile(
  connection: api.IConnection,
) {
  // Step 1: Create member account first (required dependency)
  const memberJoinData = {
    nickname: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditCommunityMember.ICreate;

  const createdMember: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberJoinData,
    });
  typia.assert(createdMember);

  // Step 2: Create minimal profile with only required display_name
  const displayName = RandomGenerator.name(2);
  const profileCreateData = {
    display_name: displayName,
    href: "https://reddit-community.com/register",
    referrer: "https://reddit-community.com/",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCommunityUserProfiles.ICreate;

  const createdProfile: IRedditCommunityUserProfiles =
    await api.functional.redditCommunity.member.userProfiles.create(
      connection,
      {
        body: profileCreateData,
      },
    );
  typia.assert(createdProfile);

  // Step 3: Validate profile creation success
  TestValidator.equals(
    "profile display name matches input",
    createdProfile.display_name,
    displayName,
  );
  TestValidator.equals(
    "member association correct",
    createdProfile.member.id,
    createdMember.id,
  );

  // Step 4: Verify optional fields are undefined/null for minimal profile
  TestValidator.equals(
    "avatar_url undefined",
    createdProfile.avatar_url,
    undefined,
  );
  TestValidator.equals("bio undefined", createdProfile.bio, undefined);
  TestValidator.equals(
    "location undefined",
    createdProfile.location,
    undefined,
  );
  TestValidator.equals(
    "website_url undefined",
    createdProfile.website_url,
    undefined,
  );
  TestValidator.equals(
    "profile_banner_url undefined",
    createdProfile.profile_banner_url,
    undefined,
  );

  // Step 5: Validate non-nullable fields have expected values
  TestValidator.predicate(
    "is_verified exists",
    typeof createdProfile.is_verified === "boolean",
  );
  TestValidator.predicate(
    "created_at exists",
    createdProfile.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    createdProfile.updated_at.length > 0,
  );
  TestValidator.predicate(
    "member nickname exists",
    createdProfile.member.nickname.length > 0,
  );
}
