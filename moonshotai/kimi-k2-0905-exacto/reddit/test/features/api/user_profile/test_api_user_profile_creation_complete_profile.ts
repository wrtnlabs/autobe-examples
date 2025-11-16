import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/**
 * Test successful creation of a complete user profile with all supported
 * personalization fields.
 *
 * This test validates that new members can establish rich personal identities
 * with comprehensive profile customization options. It covers the full range of
 * profile creation capabilities including custom display name, biography,
 * location, website URL, avatar image, and profile banner.
 *
 * The test follows this workflow:
 *
 * 1. Create a new member account to establish authentication context
 * 2. Generate complete profile data with all available personalization fields
 * 3. Create the user profile with comprehensive customization options
 * 4. Validate that all profile fields are correctly stored and returned
 * 5. Verify the profile is linked to the authenticated member
 *
 * This ensures that members can fully personalize their community presence with
 * all supported visual and textual customization options, establishing a
 * complete public identity for community participation and engagement.
 */
export async function test_api_user_profile_creation_complete_profile(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to establish authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    nickname: RandomGenerator.name(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
  } satisfies IRedditCommunityMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Generate complete profile data with all personalization fields
  const displayName = RandomGenerator.name(2);
  const profileBio = RandomGenerator.paragraph({ sentences: 5 });
  const location = RandomGenerator.name(1);
  const websiteUrl = `${RandomGenerator.pick(["https://", "http://"])}${RandomGenerator.name(1)}.com`;
  const avatarUrl = `https://example.com/avatar/${typia.random<string & tags.Format<"uuid">>()}.png`;
  const bannerUrl = `https://example.com/banner/${typia.random<string & tags.Format<"uuid">>()}.jpg`;

  const clientIp = `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}.${typia
    .random<
      number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>
    >()
    .toString()}.${typia
    .random<
      number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>
    >()
    .toString()}.${typia
    .random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>
    >()
    .toString()}`;

  // Step 3: Create the user profile with comprehensive customization
  const profileData = {
    display_name: displayName,
    bio: profileBio,
    location: location,
    website_url: websiteUrl,
    avatar_url: avatarUrl,
    profile_banner_url: bannerUrl,
    href: "https://redditcommunity.com/profile/create",
    referrer: "https://redditcommunity.com/register",
    ip: clientIp,
  } satisfies IRedditCommunityUserProfiles.ICreate;

  const profile =
    await api.functional.redditCommunity.member.userProfiles.create(
      connection,
      {
        body: profileData,
      },
    );
  typia.assert(profile);

  // Step 4: Validate that all profile fields are correctly stored and returned
  TestValidator.equals(
    "profile display name matches input",
    profile.display_name,
    displayName,
  );
  TestValidator.equals("profile bio matches input", profile.bio, profileBio);
  TestValidator.equals(
    "profile location matches input",
    profile.location,
    location,
  );
  TestValidator.equals(
    "profile website URL matches input",
    profile.website_url,
    websiteUrl,
  );
  TestValidator.equals(
    "profile avatar URL matches input",
    profile.avatar_url,
    avatarUrl,
  );
  TestValidator.equals(
    "profile banner URL matches input",
    profile.profile_banner_url,
    bannerUrl,
  );

  // Step 5: Verify the profile is linked to the authenticated member
  TestValidator.equals(
    "profile member ID matches authenticated member",
    profile.member.id,
    member.id,
  );
  TestValidator.equals(
    "profile member nickname matches",
    profile.member.nickname,
    memberData.nickname,
  );
  TestValidator.equals(
    "profile member email matches",
    profile.member.email,
    memberData.email,
  );
}
