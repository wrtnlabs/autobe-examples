import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test successful user profile update workflow including display name, bio,
 * location, and website URL modifications. Authenticate as registered user,
 * update profile information with valid data, and verify the changes are
 * properly stored and reflected in user profile response. Validates that only
 * allowed fields can be modified and profile updates follow platform content
 * guidelines.
 */
export async function test_api_user_profile_update_basic_information(
  connection: api.IConnection,
) {
  // Step 1: Create a new registered user account for testing
  const email = typia.random<string & tags.Format<"email">>();
  const userData = {
    username: RandomGenerator.alphaNumeric(12),
    email: email,
    password: "TestPassword123!",
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    location: "Seoul, South Korea",
    website_url: "https://example.com",
    href: "https://test.example.com/register",
    referrer: "https://test.example.com",
  };

  const createdUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: userData satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );

  typia.assert(createdUser);
  TestValidator.equals(
    "created user should have initial profile data",
    createdUser.displayName,
    userData.display_name,
  );

  // Step 2: Update the user's profile with new information
  const updatedDisplayName = RandomGenerator.name(3);
  const updatedBio = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const updatedLocation = "Busan, South Korea";
  const updatedWebsiteUrl = "https://updated-profile.example.com";

  const profileUpdateData = {
    display_name: updatedDisplayName,
    bio: updatedBio,
    location: updatedLocation,
    website_url: updatedWebsiteUrl,
  } satisfies IRedditPlatformRegisteredUser.IUpdate;

  const updatedProfile =
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: profileUpdateData,
      },
    );

  typia.assert(updatedProfile);

  // Step 3: Validate that all profile updates were successfully applied
  TestValidator.equals(
    "display name should be updated",
    updatedProfile.displayName,
    updatedDisplayName,
  );
  TestValidator.equals("bio should be updated", updatedProfile.bio, updatedBio);
  TestValidator.equals(
    "location should be updated",
    updatedProfile.location,
    updatedLocation,
  );
  TestValidator.equals(
    "website URL should be updated",
    updatedProfile.websiteUrl,
    updatedWebsiteUrl,
  );

  // Step 4: Verify that unchanged user data remains consistent
  TestValidator.equals(
    "user ID should remain the same",
    updatedProfile.id,
    createdUser.id,
  );
  TestValidator.equals(
    "username should remain unchanged",
    updatedProfile.username,
    createdUser.username,
  );
  TestValidator.equals(
    "email should remain unchanged",
    updatedProfile.email,
    createdUser.email,
  );

  // Step 5: Validate that profile update maintains platform standards
  TestValidator.predicate(
    "updated profile should have active account status",
    updatedProfile.accountStatus === "active",
  );
  TestValidator.predicate(
    "karma score should remain valid",
    typeof updatedProfile.karmaScore === "number" &&
      updatedProfile.karmaScore >= 0,
  );
  TestValidator.predicate(
    "updated timestamp should be recent",
    new Date(updatedProfile.updatedAt).getTime() >
      new Date(createdUser.createdAt).getTime(),
  );

  // Step 6: Test partial profile updates (only some fields)
  const partialUpdateData = {
    bio: "Updated bio with partial update",
    location: "Daegu, South Korea",
  } satisfies IRedditPlatformRegisteredUser.IUpdate;

  const partiallyUpdatedProfile =
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: partialUpdateData,
      },
    );

  typia.assert(partiallyUpdatedProfile);

  // Step 7: Validate partial updates preserve other fields
  TestValidator.equals(
    "display name should be preserved from previous update",
    partiallyUpdatedProfile.displayName,
    updatedDisplayName,
  );
  TestValidator.equals(
    "bio should be updated with partial update",
    partiallyUpdatedProfile.bio,
    partialUpdateData.bio,
  );
  TestValidator.equals(
    "location should be updated with partial update",
    partiallyUpdatedProfile.location,
    partialUpdateData.location,
  );
  TestValidator.equals(
    "website URL should be preserved from previous update",
    partiallyUpdatedProfile.websiteUrl,
    updatedWebsiteUrl,
  );
}
