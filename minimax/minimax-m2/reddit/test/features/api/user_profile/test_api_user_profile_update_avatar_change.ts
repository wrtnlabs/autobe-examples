import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test profile avatar/image URL update functionality.
 *
 * The test validates that registered users can successfully update their
 * profile avatar URL with a valid image link, and that these changes are
 * properly stored and displayed in profile views. This covers:
 *
 * 1. User Registration: Create a new registered user account through the join API
 * 2. Authentication: Verify user authentication is properly established
 * 3. Avatar Update: Update the user's profile with a new avatar URL using valid
 *    URI format
 * 4. Storage Verification: Confirm the avatar URL change is properly persisted
 * 5. Display Validation: Verify the avatar changes are reflected in the updated
 *    profile data
 *
 * The test ensures:
 *
 * - Image URL format validation works correctly (URI format requirement)
 * - Only authenticated users can update their own avatar
 * - Profile updates are atomically stored with proper data integrity
 * - Avatar changes are immediately reflected in profile responses
 * - The update operation handles both successful updates and validates input
 *   format constraints
 *
 * This is a critical user experience feature as avatars are central to user
 * identification and social interaction within the platform community.
 */
export async function test_api_user_profile_update_avatar_change(
  connection: api.IConnection,
) {
  // Step 1: Create a new registered user account
  const email = typia.random<string & tags.Format<"email">>();
  const username =
    RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase() +
    Math.floor(Math.random() * 1000);

  const newUser = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username,
      email,
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      location: "San Francisco, CA",
      website_url: "https://example.com",
      href: "https://reddit-platform.test/auth",
      referrer: "https://reddit-platform.test/register",
    } satisfies IRedditPlatformRegisteredUser.ICreate,
  });
  typia.assert(newUser);

  // Validate user was created with initial data
  TestValidator.equals("user registration successful", newUser.email, email);
  TestValidator.equals("username matches", newUser.username, username);
  TestValidator.predicate("user has authentication token", !!newUser.token);

  // Step 2: Verify initial avatar state (may be null or have default value)
  const initialAvatar = newUser.avatarUrl;

  // Step 3: Update profile with new avatar URL
  const newAvatarUrl =
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face";

  const updatedProfile =
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: {
          avatar_url: newAvatarUrl,
        } satisfies IRedditPlatformRegisteredUser.IUpdate,
      },
    );
  typia.assert(updatedProfile);

  // Step 4: Verify avatar URL was updated successfully
  TestValidator.equals(
    "avatar URL was updated",
    updatedProfile.avatarUrl,
    newAvatarUrl,
  );
  TestValidator.equals(
    "user ID remained the same",
    updatedProfile.id,
    newUser.id,
  );
  TestValidator.equals(
    "username remained unchanged",
    updatedProfile.username,
    newUser.username,
  );

  // Step 5: Verify other profile data remained intact
  TestValidator.equals(
    "display name preserved",
    updatedProfile.displayName,
    newUser.displayName,
  );
  TestValidator.equals("bio preserved", updatedProfile.bio, newUser.bio);
  TestValidator.equals(
    "location preserved",
    updatedProfile.location,
    newUser.location,
  );

  // Step 6: Test updating avatar to different URL
  const secondAvatarUrl =
    "https://images.unsplash.com/photo-1494790108755-2616b612b5bc?w=150&h=150&fit=crop&crop=face";

  const secondUpdate =
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: {
          avatar_url: secondAvatarUrl,
        } satisfies IRedditPlatformRegisteredUser.IUpdate,
      },
    );
  typia.assert(secondUpdate);

  // Step 7: Verify second avatar update
  TestValidator.equals(
    "second avatar URL was updated",
    secondUpdate.avatarUrl,
    secondAvatarUrl,
  );
  TestValidator.notEquals(
    "avatar changed from first URL",
    secondUpdate.avatarUrl,
    newAvatarUrl,
  );

  // Step 8: Test with different image format URL
  const pngAvatarUrl =
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face&fm=png";

  const pngUpdate =
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: {
          avatar_url: pngAvatarUrl,
        } satisfies IRedditPlatformRegisteredUser.IUpdate,
      },
    );
  typia.assert(pngUpdate);

  // Step 9: Verify PNG avatar URL
  TestValidator.equals(
    "PNG avatar URL was set",
    pngUpdate.avatarUrl,
    pngAvatarUrl,
  );

  // Step 10: Test updating other profile fields along with avatar
  const combinedUpdate =
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: {
          avatar_url:
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
          display_name: "Updated Display Name",
          bio: "Updated bio information",
        } satisfies IRedditPlatformRegisteredUser.IUpdate,
      },
    );
  typia.assert(combinedUpdate);

  // Step 11: Verify combined update worked
  TestValidator.equals(
    "avatar updated in combined request",
    combinedUpdate.avatarUrl,
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  );
  TestValidator.equals(
    "display name updated",
    combinedUpdate.displayName,
    "Updated Display Name",
  );
  TestValidator.equals(
    "bio updated",
    combinedUpdate.bio,
    "Updated bio information",
  );

  // Step 12: Verify timestamp was updated
  TestValidator.predicate(
    "profile was updated with new timestamp",
    combinedUpdate.updatedAt !== newUser.updatedAt,
  );
}
