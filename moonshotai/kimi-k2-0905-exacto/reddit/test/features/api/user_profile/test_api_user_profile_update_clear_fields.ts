import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/**
 * Test clearing profile fields by setting them to null.
 *
 * This test validates the ability to clear profile fields through the update
 * endpoint by sending null values. The test creates a member account,
 * establishes an initial profile with populated fields, then selectively clears
 * various fields to ensure the API properly handles null inputs.
 *
 * Test flow:
 *
 * 1. Create a new member account via join
 * 2. Create an initial profile with filled fields
 * 3. Update profile to set various fields to null
 * 4. Verify response shows fields cleared
 * 5. Confirm selective clearing preserves other data
 */
export async function test_api_user_profile_update_clear_fields(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberData = {
    nickname: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
  } satisfies IRedditCommunityMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create initial profile with populated fields
  const createProfileData = {
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.name(2),
    website_url: `https://example.com/${RandomGenerator.name(1)}`,
    avatar_url: `https://images.example.com/avatar-${RandomGenerator.alphaNumeric(8)}.jpg`,
    profile_banner_url: `https://images.example.com/banner-${RandomGenerator.alphaNumeric(8)}.jpg`,
    ip: "127.0.0.1",
    referrer: "https://reddit-community.com",
    href: "https://reddit-community.com/profile/create",
  } satisfies IRedditCommunityUserProfiles.ICreate;

  let profile = await api.functional.redditCommunity.member.userProfiles.create(
    connection,
    {
      body: createProfileData,
    },
  );
  typia.assert(profile);

  // Step 3: Clear bio and location fields by setting to null
  const clearBioLocationData = {
    bio: null,
    location: null,
  } satisfies IRedditCommunityUserProfiles.IUpdate;

  profile = await api.functional.redditCommunity.member.userProfiles.update(
    connection,
    {
      profileId: profile.id,
      body: clearBioLocationData,
    },
  );
  typia.assert(profile);

  // Verify bio and location are cleared
  TestValidator.equals(
    "bio should be cleared after null update",
    profile.bio,
    null,
  );
  TestValidator.equals(
    "location should be cleared after null update",
    profile.location,
    null,
  );

  // Verify other fields are preserved
  TestValidator.equals(
    "display_name should be preserved",
    profile.display_name,
    createProfileData.display_name,
  );
  TestValidator.equals(
    "website_url should be preserved",
    profile.website_url,
    createProfileData.website_url,
  );
  TestValidator.equals(
    "avatar_url should be preserved",
    profile.avatar_url,
    createProfileData.avatar_url,
  );
  TestValidator.equals(
    "profile_banner_url should be preserved",
    profile.profile_banner_url,
    createProfileData.profile_banner_url,
  );

  // Step 4: Clear website and avatar URL fields
  const clearUrlData = {
    website_url: null,
    avatar_url: null,
  } satisfies IRedditCommunityUserProfiles.IUpdate;

  profile = await api.functional.redditCommunity.member.userProfiles.update(
    connection,
    {
      profileId: profile.id,
      body: clearUrlData,
    },
  );
  typia.assert(profile);

  // Verify URLs are cleared
  TestValidator.equals(
    "website_url should be cleared after null update",
    profile.website_url,
    null,
  );
  TestValidator.equals(
    "avatar_url should be cleared after null update",
    profile.avatar_url,
    null,
  );

  // Verify remaining fields
  TestValidator.equals("bio should remain cleared", profile.bio, null);
  TestValidator.equals(
    "location should remain cleared",
    profile.location,
    null,
  );
  TestValidator.equals(
    "profile_banner_url should be preserved",
    profile.profile_banner_url,
    createProfileData.profile_banner_url,
  );

  // Step 5: Clear banner URL
  const clearBannerData = {
    profile_banner_url: null,
  } satisfies IRedditCommunityUserProfiles.IUpdate;

  profile = await api.functional.redditCommunity.member.userProfiles.update(
    connection,
    {
      profileId: profile.id,
      body: clearBannerData,
    },
  );
  typia.assert(profile);

  // Verify final state
  TestValidator.equals(
    "profile_banner_url should be cleared",
    profile.profile_banner_url,
    null,
  );
  TestValidator.equals(
    "display_name should remain unchanged",
    profile.display_name,
    createProfileData.display_name,
  );

  // All optional fields should now be null or undefined
  TestValidator.equals("all cleared fields should be null", profile.bio, null);
  TestValidator.equals(
    "all cleared fields should be null",
    profile.location,
    null,
  );
  TestValidator.equals(
    "all cleared fields should be null",
    profile.website_url,
    null,
  );
  TestValidator.equals(
    "all cleared fields should be null",
    profile.avatar_url,
    null,
  );
  TestValidator.equals(
    "all cleared fields should be null",
    profile.profile_banner_url,
    null,
  );
}
