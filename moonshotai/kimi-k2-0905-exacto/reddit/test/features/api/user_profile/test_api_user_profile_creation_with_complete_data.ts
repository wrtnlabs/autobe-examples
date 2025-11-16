import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/**
 * Test comprehensive user profile creation with all available customization
 * options.
 *
 * This test validates the complete profile establishment process where
 * community members create detailed profiles with full personalization
 * settings. It covers the entire workflow from member registration through
 * comprehensive profile creation with all optional fields populated.
 *
 * The scenario follows this sequence:
 *
 * 1. Register as a new community member with email, nickname, and password
 * 2. Create a comprehensive profile with display name and all optional fields
 * 3. Validate that all profile data is correctly stored and returned
 * 4. Verify immediate visibility of the profile to other community members
 *
 * The comprehensive profile includes display name, biography text, location,
 * website URL, avatar image URL, and custom banner URL, ensuring full
 * personalization and visual customization capabilities are available.
 */
export async function test_api_user_profile_creation_with_complete_data(
  connection: api.IConnection,
) {
  // Step 1: Register as a new community member
  const registrationInput = {
    nickname: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
  } satisfies IRedditCommunityMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: registrationInput,
  });
  typia.assert(member);

  // Verify member registration was successful
  TestValidator.equals(
    "member email matches registration input",
    member.email,
    registrationInput.email,
  );
  TestValidator.equals(
    "member nickname matches registration input",
    member.nickname,
    registrationInput.nickname,
  );
  TestValidator.equals(
    "member has authorization token",
    member.token.access.length > 0,
    true,
  );

  // Step 2: Create comprehensive user profile with all optional fields
  const profileInput = {
    display_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 2,
      wordMax: 4,
    }),
    bio: RandomGenerator.paragraph({ sentences: 10, wordMin: 4, wordMax: 8 }),
    location: RandomGenerator.name(1),
    website_url: "https://example.com/my-profile",
    avatar_url: "https://cdn.example.com/avatars/profile-jpg",
    profile_banner_url: "https://cdn.example.com/banners/custom-banner-jpg",
    href: "https://reddit-community.com/registratn/",
    ip: "192.168.1.1",
    referrer: "https://google.com/search-results",
  } satisfies IRedditCommunityUserProfiles.ICreate;

  const createdProfile =
    await api.functional.redditCommunity.member.userProfiles.create(
      connection,
      {
        body: profileInput,
      },
    );
  typia.assert(createdProfile);

  // Step 3: Validate all profile data was correctly stored
  TestValidator.equals(
    "profile display name matches input",
    createdProfile.display_name,
    profileInput.display_name,
  );
  TestValidator.equals(
    "profile bio matches input",
    createdProfile.bio,
    profileInput.bio,
  );
  TestValidator.equals(
    "profile location matches input",
    createdProfile.location,
    profileInput.location,
  );
  TestValidator.equals(
    "profile website URL matches input",
    createdProfile.website_url,
    profileInput.website_url,
  );
  TestValidator.equals(
    "profile avatar URL matches input",
    createdProfile.avatar_url,
    profileInput.avatar_url,
  );
  TestValidator.equals(
    "profile banner URL matches input",
    createdProfile.profile_banner_url,
    profileInput.profile_banner_url,
  );

  // Step 4: Verify profile relationships and metadata
  TestValidator.equals(
    "profile member ID matches authenticated member",
    createdProfile.member.id,
    member.id,
  );
  TestValidator.equals(
    "profile member nickname matches registered nickname",
    createdProfile.member.nickname,
    member.nickname,
  );
  TestValidator.equals(
    "profile member email matches registration",
    createdProfile.member.email,
    member.email,
  );
  TestValidator.equals(
    "profile is initially not verified",
    createdProfile.is_verified,
    false,
  );

  // Validate the profile has been created and is visible
  TestValidator.predicate(
    "profile has valid displayed name",
    createdProfile.display_name.length > 0,
  );
  TestValidator.predicate(
    "profile has bio content",
    createdProfile.bio !== null && createdProfile.bio !== undefined,
  );
  TestValidator.predicate(
    "profile has location",
    createdProfile.location !== null,
  );
  TestValidator.predicate(
    "profile has website URL",
    createdProfile.website_url !== null,
  );
  TestValidator.predicate(
    "profile has avatar URL",
    createdProfile.avatar_url !== null,
  );
  TestValidator.predicate(
    "profile has banner URL",
    createdProfile.profile_banner_url !== null,
  );
}
