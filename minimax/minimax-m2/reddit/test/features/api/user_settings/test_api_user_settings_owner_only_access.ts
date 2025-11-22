import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformNotificationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformNotificationSettings";
import type { IRedditPlatformPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPrivacySettings";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_user_settings_owner_only_access(
  connection: api.IConnection,
) {
  // Step 1: Create first user account for ownership testing
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `testuser_${RandomGenerator.alphaNumeric(8)}`,
        email: firstUserEmail,
        password: "SecurePass123!",
        display_name: "First Test User",
        bio: "First test user for settings ownership testing",
        location: "Test City",
        website_url: "https://firstuser.test.com",
        avatar_url: "https://avatar.firstuser.test.com/avatar.jpg",
        href: "https://testapp.com/register",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(firstUser);

  // Step 2: Create second user account to test unauthorized access prevention
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `testuser_${RandomGenerator.alphaNumeric(8)}`,
        email: secondUserEmail,
        password: "SecurePass456!",
        display_name: "Second Test User",
        bio: "Second test user for unauthorized access testing",
        location: "Test City 2",
        website_url: "https://seconduser.test.com",
        avatar_url: "https://avatar.seconduser.test.com/avatar.jpg",
        href: "https://testapp.com/register",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(secondUser);

  // Step 3: First user logs in and attempts to modify second user's settings (should fail)
  await api.functional.auth.registeredUser.login(connection, {
    body: {
      email: firstUserEmail,
      password: "SecurePass123!",
      href: "https://testapp.com/login",
      referrer: "https://testapp.com",
    } satisfies IRedditPlatformRegisteredUser.ILogin,
  });

  // Attempt to modify second user's settings - should be blocked by access control
  await TestValidator.error(
    "first user cannot modify second user's settings",
    async () => {
      await api.functional.redditPlatform.registeredUser.auth._settings.updateSettings(
        connection,
        {
          body: {
            display_name: "Hacked Display Name",
            bio: "Unauthorized modification attempt",
            password: "SecurePass123!", // Current password of first user
            href: "https://testapp.com/settings",
            referrer: "https://testapp.com",
          } satisfies IRedditPlatformRegisteredUser.IUpdateAuthSettings,
        },
      );
    },
  );

  // Step 4: Second user logs in and successfully modifies their own settings (should succeed)
  await api.functional.auth.registeredUser.login(connection, {
    body: {
      email: secondUserEmail,
      password: "SecurePass456!",
      href: "https://testapp.com/login",
      referrer: "https://testapp.com",
    } satisfies IRedditPlatformRegisteredUser.ILogin,
  });

  // Successfully update second user's own settings
  const updatedSecondUser: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth._settings.updateSettings(
      connection,
      {
        body: {
          display_name: "Updated Display Name",
          bio: "Updated bio information",
          location: "Updated Location",
          website_url: "https://updated.seconduser.test.com",
          avatar_url: "https://updated.avatar.seconduser.test.com/avatar.jpg",
          password: "SecurePass456!",
          href: "https://testapp.com/settings",
          referrer: "https://testapp.com",
        } satisfies IRedditPlatformRegisteredUser.IUpdateAuthSettings,
      },
    );
  typia.assert(updatedSecondUser);

  // Step 5: Validate that the settings were actually updated for the correct user
  TestValidator.equals(
    "updated user display name matches",
    updatedSecondUser.displayName,
    "Updated Display Name",
  );
  TestValidator.equals(
    "updated user bio matches",
    updatedSecondUser.bio,
    "Updated bio information",
  );
  TestValidator.equals(
    "updated user location matches",
    updatedSecondUser.location,
    "Updated Location",
  );
  TestValidator.equals(
    "updated user website URL matches",
    updatedSecondUser.websiteUrl,
    "https://updated.seconduser.test.com",
  );
  TestValidator.equals(
    "updated user avatar URL matches",
    updatedSecondUser.avatarUrl,
    "https://updated.avatar.seconduser.test.com/avatar.jpg",
  );

  // Step 6: Verify that user IDs are different (ensuring we modified the correct user)
  TestValidator.notEquals(
    "user IDs should be different",
    firstUser.id,
    secondUser.id,
  );
  TestValidator.equals(
    "updated user ID matches second user ID",
    updatedSecondUser.id,
    secondUser.id,
  );
}
