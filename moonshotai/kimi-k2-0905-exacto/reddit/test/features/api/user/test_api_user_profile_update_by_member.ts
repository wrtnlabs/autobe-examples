import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

export async function test_api_user_profile_update_by_member(
  connection: api.IConnection,
) {
  // 1. Register as a new member to establish authentication
  const memberData = {
    nickname: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
  } satisfies IRedditCommunityMember.ICreate;

  const authorizedMember: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authorizedMember);

  TestValidator.predicate(
    "member should have access token",
    authorizedMember.token.access.length > 0,
  );

  // 2. Create initial user profile to update
  const profileData = {
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: "Seoul, South Korea",
    avatar_url: `https://example.com/avatar-${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    website_url: "https://myblog.example.com",
    profile_banner_url: `https://example.com/banner-${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    href: "https://reddit-community.com/signup",
    ip: "127.0.0.1",
    referrer: "https://google.com",
  } satisfies IRedditCommunityUserProfiles.ICreate;

  const originalProfile: IRedditCommunityUserProfiles =
    await api.functional.redditCommunity.member.userProfiles.create(
      connection,
      {
        body: profileData,
      },
    );
  typia.assert(originalProfile);

  // Validate original profile was created successfully
  TestValidator.equals(
    "profile should have correct display name",
    originalProfile.display_name,
    profileData.display_name,
  );
  TestValidator.equals(
    "profile should have correct bio",
    originalProfile.bio,
    profileData.bio,
  );
  TestValidator.equals(
    "profile should have correct location",
    originalProfile.location,
    profileData.location,
  );
  TestValidator.equals(
    "profile should link to correct member",
    originalProfile.member.id,
    authorizedMember.id,
  );

  // 3. Test partial update - only update display name and bio
  const partialUpdateData1 = {
    display_name: "UpdatedDisplayName",
    bio: "This is my updated bio after changing my display name.",
  } satisfies IRedditCommunityUserProfiles.IUpdate;

  const updatedProfile1: IRedditCommunityUserProfiles =
    await api.functional.redditCommunity.member.userProfiles.update(
      connection,
      {
        profileId: originalProfile.id,
        body: partialUpdateData1,
      },
    );
  typia.assert(updatedProfile1);

  // Verify partial update worked correctly
  TestValidator.equals(
    "partial update should change display name",
    updatedProfile1.display_name,
    partialUpdateData1.display_name,
  );
  TestValidator.equals(
    "partial update should change bio",
    updatedProfile1.bio,
    partialUpdateData1.bio,
  );

  // Original fields should remain unchanged
  TestValidator.equals(
    "location should remain unchanged",
    updatedProfile1.location,
    originalProfile.location,
  );
  TestValidator.equals(
    "avatar URL should remain unchanged",
    updatedProfile1.avatar_url,
    originalProfile.avatar_url,
  );
  TestValidator.equals(
    "website URL should remain unchanged",
    updatedProfile1.website_url,
    originalProfile.website_url,
  );
  TestValidator.equals(
    "banner URL should remain unchanged",
    updatedProfile1.profile_banner_url,
    originalProfile.profile_banner_url,
  );

  // 4. Test null value update - clear some fields
  const nullUpdateData = {
    location: null,
    website_url: null,
    profile_banner_url: null,
  } satisfies IRedditCommunityUserProfiles.IUpdate;

  const updatedProfile2: IRedditCommunityUserProfiles =
    await api.functional.redditCommunity.member.userProfiles.update(
      connection,
      {
        profileId: updatedProfile1.id,
        body: nullUpdateData,
      },
    );
  typia.assert(updatedProfile2);

  // Verify null values properly cleared existing data
  TestValidator.equals(
    "location should be cleared",
    updatedProfile2.location,
    null,
  );
  TestValidator.equals(
    "website URL should be cleared",
    updatedProfile2.website_url,
    null,
  );
  TestValidator.equals(
    "banner URL should be cleared",
    updatedProfile2.profile_banner_url,
    null,
  );

  // Non-null fields should remain unchanged
  TestValidator.equals(
    "display name should remain unchanged",
    updatedProfile2.display_name,
    updatedProfile1.display_name,
  );
  TestValidator.equals(
    "bio should remain unchanged",
    updatedProfile2.bio,
    updatedProfile1.bio,
  );
  TestValidator.equals(
    "avatar URL should remain unchanged",
    updatedProfile2.avatar_url,
    updatedProfile1.avatar_url,
  );

  // 5. Test complete profile update
  const completeUpdateData = {
    display_name: "CompleteUpdateName",
    bio: RandomGenerator.content({ paragraphs: 2 }),
    location: "San Francisco, CA",
    avatar_url: `https://cdn.example.com/new-avatar-${typia.random<string & tags.Format<"uuid">>()}.png`,
    website_url: "https://myupdatedwebsite.dev",
    profile_banner_url: `https://cdn.example.com/new-banner-${typia.random<string & tags.Format<"uuid">>()}.png`,
  } satisfies IRedditCommunityUserProfiles.IUpdate;

  const finalProfile: IRedditCommunityUserProfiles =
    await api.functional.redditCommunity.member.userProfiles.update(
      connection,
      {
        profileId: updatedProfile2.id,
        body: completeUpdateData,
      },
    );
  typia.assert(finalProfile);

  // Verify complete update worked correctly
  TestValidator.equals(
    "complete update should change all fields",
    finalProfile.display_name,
    completeUpdateData.display_name,
  );
  TestValidator.equals(
    "complete update should change bio",
    finalProfile.bio,
    completeUpdateData.bio,
  );
  TestValidator.equals(
    "complete update should change location",
    finalProfile.location,
    completeUpdateData.location,
  );
  TestValidator.equals(
    "complete update should change avatar URL",
    finalProfile.avatar_url,
    completeUpdateData.avatar_url,
  );
  TestValidator.equals(
    "complete update should change website URL",
    finalProfile.website_url,
    completeUpdateData.website_url,
  );
  TestValidator.equals(
    "complete update should change banner URL",
    finalProfile.profile_banner_url,
    completeUpdateData.profile_banner_url,
  );

  // 6. Verify timestamp updates reflect modifications
  TestValidator.predicate(
    "updated_at should be more recent than created_at",
    new Date(finalProfile.updated_at) > new Date(originalProfile.created_at),
  );

  // 7. Test authorization - verify member cannot update another member's profile
  // Create a second member to test cross-profile access prevention
  await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: "DifferentPass123!",
    } satisfies IRedditCommunityMember.ICreate,
  });

  // This should fail since we're trying to update a profile owned by the first member
  await TestValidator.error(
    "should prevent updating another member's profile",
    async () => {
      await api.functional.redditCommunity.member.userProfiles.update(
        connection,
        {
          profileId: originalProfile.id, // Profile from first member
          body: {
            display_name: "ShouldNotWork",
          } satisfies IRedditCommunityUserProfiles.IUpdate,
        },
      );
    },
  );
}
