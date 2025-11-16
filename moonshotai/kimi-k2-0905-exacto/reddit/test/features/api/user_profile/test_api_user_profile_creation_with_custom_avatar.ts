import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/**
 * Test community member creating a user profile with custom avatar and banner
 * image URLs for enhanced visual personalization. Validates profile creation
 * with visual customization options. The test verifies successful profile
 * establishment with image URLs properly stored and visual identity immediately
 * reflected in community interactions.
 *
 * Test workflow:
 *
 * 1. Register a new member account with email, nickname, and password
 * 2. Create user profile with custom avatar URL, banner URL, display name, bio,
 *    and location
 * 3. Validate the created profile contains all visual customization data
 * 4. Verify profile data matches the input specifications
 * 5. Test that the member ID is properly linked to the profile
 */
export async function test_api_user_profile_creation_with_custom_avatar(
  connection: api.IConnection,
) {
  // Register a new member account first
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // Create user profile with custom avatar and banner URLs
  const avatarUrl = `https://example.com/avatars/${RandomGenerator.alphaNumeric(8)}.png`;
  const bannerUrl = `https://example.com/banners/${RandomGenerator.alphaNumeric(8)}.jpg`;
  const displayName = RandomGenerator.name(2);
  const bio = RandomGenerator.paragraph({ sentences: 3 });
  const location = RandomGenerator.pick([
    "New York",
    "San Francisco",
    "Chicago",
    "Boston",
  ]);
  const websiteUrl = `https://${RandomGenerator.name()}.com`;

  const profile: IRedditCommunityUserProfiles =
    await api.functional.redditCommunity.member.userProfiles.create(
      connection,
      {
        body: {
          display_name: displayName,
          bio: bio,
          location: location,
          avatar_url: avatarUrl,
          profile_banner_url: bannerUrl,
          website_url: websiteUrl,
          href: "https://reddit-community.com/profile/create",
          referrer: "https://reddit-community.com/join",
          ip: "192.168.1.1",
        } satisfies IRedditCommunityUserProfiles.ICreate,
      },
    );
  typia.assert(profile);

  // Validate profile creation with visual customization
  TestValidator.equals(
    "profile display name matches",
    profile.display_name,
    displayName,
  );
  TestValidator.equals("profile bio matches", profile.bio, bio);
  TestValidator.equals("profile location matches", profile.location, location);
  TestValidator.equals(
    "profile avatar URL matches",
    profile.avatar_url,
    avatarUrl,
  );
  TestValidator.equals(
    "profile banner URL matches",
    profile.profile_banner_url,
    bannerUrl,
  );
  TestValidator.equals(
    "profile website URL matches",
    profile.website_url,
    websiteUrl,
  );
  TestValidator.equals(
    "profile member ID matches",
    profile.member.id,
    member.id,
  );
  TestValidator.equals(
    "profile member nickname matches",
    profile.member.nickname,
    member.nickname,
  );
  TestValidator.equals(
    "profile member email matches",
    profile.member.email,
    member.email,
  );

  // Verify visual customization is enabled
  TestValidator.predicate(
    "avatar URL is not null",
    profile.avatar_url !== null,
  );
  TestValidator.predicate(
    "banner URL is not null",
    profile.profile_banner_url !== null,
  );
  TestValidator.predicate("profile is verified", profile.is_verified === true);
  TestValidator.predicate(
    "display name is within limit",
    profile.display_name.length <= 50,
  );

  // Handle optional nullable fields properly
  if (profile.bio !== null && profile.bio !== undefined) {
    TestValidator.predicate("bio is within limit", profile.bio.length <= 500);
  }
  if (profile.location !== null && profile.location !== undefined) {
    TestValidator.predicate(
      "location is within limit",
      profile.location.length <= 100,
    );
  }
}
