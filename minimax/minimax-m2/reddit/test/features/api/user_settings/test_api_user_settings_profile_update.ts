import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformNotificationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformNotificationSettings";
import type { IRedditPlatformPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPrivacySettings";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test registered user successfully updates their authentication settings
 * including profile information.
 *
 * This test validates the complete workflow of a registered user updating their
 * profile settings through the Reddit platform API. The test covers user
 * account creation, authentication, settings modification, and verification
 * that changes are properly persisted and reflected in subsequent requests.
 *
 * The test generates realistic user profile data including display name, bio,
 * location, website URL, and avatar URL, then validates that all changes are
 * correctly applied and maintained by the system.
 */
export async function test_api_user_settings_profile_update(
  connection: api.IConnection,
) {
  // Step 1: Create a new registered user account
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphaNumeric(16);
  const userUsername: string = RandomGenerator.alphaNumeric(12);

  const createUserResponse: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        username: userUsername,
        display_name: "Initial User",
        href: "https://reddit-test.com/register",
        referrer: "https://reddit-test.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });

  typia.assert(createUserResponse);
  TestValidator.equals(
    "user account created successfully",
    createUserResponse.email,
    userEmail,
  );

  // Step 2: Authenticate the user to obtain fresh tokens
  const loginResponse: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://reddit-test.com/login",
        referrer: "https://reddit-test.com",
      } satisfies IRedditPlatformRegisteredUser.ILogin,
    });

  typia.assert(loginResponse);
  TestValidator.equals(
    "user authentication successful",
    loginResponse.email,
    userEmail,
  );
  TestValidator.equals(
    "user ID matches created account",
    loginResponse.id,
    createUserResponse.id,
  );

  // Step 3: Generate new profile information for update
  const newDisplayName: string = RandomGenerator.name(2);
  const newBio: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const newLocation: string = RandomGenerator.name(1);
  const newWebsiteUrl: string = `https://${RandomGenerator.alphaNumeric(8)}.com`;
  const newAvatarUrl: string = `https://cdn.reddit.com/avatars/${RandomGenerator.alphaNumeric(16)}.png`;

  // Step 4: Update user settings with new profile information
  const updateSettingsResponse: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth._settings.updateSettings(
      connection,
      {
        body: {
          display_name: newDisplayName,
          bio: newBio,
          location: newLocation,
          website_url: newWebsiteUrl,
          avatar_url: newAvatarUrl,
          password: userPassword, // Required for authentication verification
          href: "https://reddit-test.com/settings",
          referrer: "https://reddit-test.com/profile",
        } satisfies IRedditPlatformRegisteredUser.IUpdateAuthSettings,
      },
    );

  typia.assert(updateSettingsResponse);

  // Step 5: Validate the updated profile information
  TestValidator.equals(
    "display name updated correctly",
    updateSettingsResponse.displayName,
    newDisplayName,
  );

  // Handle nullable bio field safely
  if (
    updateSettingsResponse.bio !== null &&
    updateSettingsResponse.bio !== undefined
  ) {
    TestValidator.equals(
      "bio updated correctly",
      updateSettingsResponse.bio,
      newBio,
    );
  }

  // Handle nullable location field safely
  if (
    updateSettingsResponse.location !== null &&
    updateSettingsResponse.location !== undefined
  ) {
    TestValidator.equals(
      "location updated correctly",
      updateSettingsResponse.location,
      newLocation,
    );
  }

  // Handle nullable website URL field safely
  if (
    updateSettingsResponse.websiteUrl !== null &&
    updateSettingsResponse.websiteUrl !== undefined
  ) {
    TestValidator.equals(
      "website URL updated correctly",
      updateSettingsResponse.websiteUrl,
      newWebsiteUrl,
    );
  }

  // Handle nullable avatar URL field safely
  if (
    updateSettingsResponse.avatarUrl !== null &&
    updateSettingsResponse.avatarUrl !== undefined
  ) {
    TestValidator.equals(
      "avatar URL updated correctly",
      updateSettingsResponse.avatarUrl,
      newAvatarUrl,
    );
  }

  // Step 6: Verify data persistence and consistency
  TestValidator.equals(
    "user ID remains consistent",
    updateSettingsResponse.id,
    loginResponse.id,
  );
  TestValidator.equals(
    "email remains unchanged",
    updateSettingsResponse.email,
    userEmail,
  );
  TestValidator.equals(
    "username remains unchanged",
    updateSettingsResponse.username,
    userUsername,
  );

  // Step 7: Validate system-managed fields are properly maintained
  TestValidator.predicate(
    "account status is active",
    updateSettingsResponse.accountStatus === "active",
  );
  TestValidator.predicate(
    "email verification status maintained",
    typeof updateSettingsResponse.emailVerified === "boolean",
  );
  TestValidator.predicate(
    "karma score is non-negative number",
    typeof updateSettingsResponse.karmaScore === "number" &&
      updateSettingsResponse.karmaScore >= 0,
  );

  // Step 8: Verify timestamp fields are present and valid
  TestValidator.predicate(
    "created timestamp exists",
    updateSettingsResponse.createdAt !== undefined &&
      updateSettingsResponse.createdAt !== null,
  );
  TestValidator.predicate(
    "updated timestamp exists and is recent",
    updateSettingsResponse.updatedAt !== undefined &&
      updateSettingsResponse.updatedAt !== null &&
      new Date(updateSettingsResponse.updatedAt).getTime() > Date.now() - 60000, // Within last minute
  );

  // Step 9: Test with partial updates (optional fields)
  const partialUpdateResponse: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth._settings.updateSettings(
      connection,
      {
        body: {
          display_name: "Updated Display Name",
          password: userPassword,
          href: "https://reddit-test.com/settings",
          referrer: "https://reddit-test.com/profile",
        } satisfies IRedditPlatformRegisteredUser.IUpdateAuthSettings,
      },
    );

  typia.assert(partialUpdateResponse);

  // Validate that unupdated fields are preserved
  if (
    partialUpdateResponse.bio !== null &&
    partialUpdateResponse.bio !== undefined
  ) {
    TestValidator.equals(
      "partial update preserves previous bio",
      partialUpdateResponse.bio,
      newBio,
    );
  }

  if (
    partialUpdateResponse.location !== null &&
    partialUpdateResponse.location !== undefined
  ) {
    TestValidator.equals(
      "partial update preserves previous location",
      partialUpdateResponse.location,
      newLocation,
    );
  }

  TestValidator.equals(
    "display name updated in partial update",
    partialUpdateResponse.displayName,
    "Updated Display Name",
  );
}
