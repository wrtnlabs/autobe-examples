import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test field validation and constraints during profile update operations.
 *
 * This test validates that the Reddit platform properly enforces data integrity
 * and validation rules during profile updates. The test creates an
 * authenticated user account, then systematically tests invalid field inputs
 * including oversized content (bio, display name, location), malformed URLs
 * (website, avatar), and invalid email formats. Each invalid attempt is
 * verified to fail with appropriate validation errors while ensuring existing
 * valid data remains preserved. The test also validates successful updates with
 * correct data to ensure the API works properly for valid inputs.
 */
export async function test_api_user_profile_update_field_validation(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user account for testing
  const testEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    username: `testuser_${typia.random<string & tags.Pattern<"[a-z0-9_]{8}">>()}`,
    email: testEmail,
    password: "TestPassword123!",
    display_name: "Test User",
    bio: "This is a test user bio",
    location: "Test City, Test Country",
    website_url: "https://example.com",
    avatar_url: "https://example.com/avatar.jpg",
    href: "https://test.example.com/register",
    referrer: "https://test.example.com/home",
  } satisfies IRedditPlatformRegisteredUser.ICreate;

  const createdUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(createdUser);

  // Step 2: Test invalid bio (exceeds 1000 character limit)
  await TestValidator.error("bio exceeds maximum length limit", async () => {
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: {
          bio: RandomGenerator.content({
            paragraphs: 50,
            sentenceMin: 20,
            sentenceMax: 30,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IRedditPlatformRegisteredUser.IUpdate,
      },
    );
  });

  // Step 3: Test invalid display name (exceeds 100 character limit)
  await TestValidator.error(
    "display name exceeds maximum length limit",
    async () => {
      await api.functional.redditPlatform.registeredUser.auth.profile.update(
        connection,
        {
          body: {
            display_name: RandomGenerator.paragraph({
              sentences: 20,
              wordMin: 3,
              wordMax: 8,
            }),
          } satisfies IRedditPlatformRegisteredUser.IUpdate,
        },
      );
    },
  );

  // Step 4: Test invalid location (exceeds 100 character limit)
  await TestValidator.error(
    "location exceeds maximum length limit",
    async () => {
      await api.functional.redditPlatform.registeredUser.auth.profile.update(
        connection,
        {
          body: {
            location: RandomGenerator.paragraph({
              sentences: 20,
              wordMin: 3,
              wordMax: 8,
            }),
          } satisfies IRedditPlatformRegisteredUser.IUpdate,
        },
      );
    },
  );

  // Step 5: Test invalid website URL (malformed URI)
  await TestValidator.error(
    "website URL must be valid URI format",
    async () => {
      await api.functional.redditPlatform.registeredUser.auth.profile.update(
        connection,
        {
          body: {
            website_url: "not-a-valid-url",
          } satisfies IRedditPlatformRegisteredUser.IUpdate,
        },
      );
    },
  );

  // Step 6: Test invalid avatar URL (malformed URI)
  await TestValidator.error("avatar URL must be valid URI format", async () => {
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: {
          avatar_url: "http://invalid-url-format",
        } satisfies IRedditPlatformRegisteredUser.IUpdate,
      },
    );
  });

  // Step 7: Test invalid email format
  await TestValidator.error("email must be valid email format", async () => {
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: {
          email: "invalid-email-format",
        } satisfies IRedditPlatformRegisteredUser.IUpdate,
      },
    );
  });

  // Step 8: Test that valid data is preserved after failed updates
  const currentProfile: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: {} satisfies IRedditPlatformRegisteredUser.IUpdate,
      },
    );
  typia.assert(currentProfile);

  // Verify that all original data is still intact
  TestValidator.equals(
    "original bio preserved",
    currentProfile.bio,
    "This is a test user bio",
  );
  TestValidator.equals(
    "original location preserved",
    currentProfile.location,
    "Test City, Test Country",
  );
  TestValidator.equals(
    "original website URL preserved",
    currentProfile.websiteUrl,
    "https://example.com",
  );
  TestValidator.equals(
    "original avatar URL preserved",
    currentProfile.avatarUrl,
    "https://example.com/avatar.jpg",
  );
  TestValidator.equals(
    "original email preserved",
    currentProfile.email,
    testEmail,
  );

  // Step 9: Test successful update with valid data
  const validUpdateBody = {
    display_name: "Updated Test User",
    bio: "Updated bio with valid length",
    location: "Updated Location",
    website_url: "https://updated-website.com",
    avatar_url: "https://updated-website.com/new-avatar.jpg",
  } satisfies IRedditPlatformRegisteredUser.IUpdate;

  const updatedProfile: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: validUpdateBody,
      },
    );
  typia.assert(updatedProfile);

  // Verify the update was successful
  TestValidator.equals(
    "display name updated successfully",
    updatedProfile.displayName,
    "Updated Test User",
  );
  TestValidator.equals(
    "bio updated successfully",
    updatedProfile.bio,
    "Updated bio with valid length",
  );
  TestValidator.equals(
    "location updated successfully",
    updatedProfile.location,
    "Updated Location",
  );
  TestValidator.equals(
    "website URL updated successfully",
    updatedProfile.websiteUrl,
    "https://updated-website.com",
  );
  TestValidator.equals(
    "avatar URL updated successfully",
    updatedProfile.avatarUrl,
    "https://updated-website.com/new-avatar.jpg",
  );
}
