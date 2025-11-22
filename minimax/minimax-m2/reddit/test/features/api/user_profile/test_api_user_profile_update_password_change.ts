import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_user_profile_update_password_change(
  connection: api.IConnection,
) {
  // Step 1: Create a new registered user account for testing
  const testEmail = typia.random<string & tags.Format<"email">>();
  const currentPassword = "TestPassword123!";

  const newUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `testuser_${RandomGenerator.alphabets(8)}`,
        email: testEmail,
        password: currentPassword,
        href: "https://test.example.com/register",
        referrer: "https://test.example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(newUser);

  // Verify user was created successfully and has proper authentication token
  TestValidator.equals(
    "user authentication successful",
    newUser.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "user account status is active",
    newUser.accountStatus,
    "active",
  );

  // Step 2: Test successful password update with valid current password
  const newPassword = "NewSecurePassword456!";
  const updatedUser: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: {
          password: `${currentPassword}:${newPassword}`,
        } satisfies IRedditPlatformRegisteredUser.IUpdate,
      },
    );
  typia.assert(updatedUser);

  // Verify password update was successful
  TestValidator.equals("password update completed", updatedUser.id, newUser.id);
  TestValidator.equals(
    "user data preserved after update",
    updatedUser.username,
    newUser.username,
  );
  TestValidator.equals("email unchanged", updatedUser.email, newUser.email);

  // Step 3: Test password complexity requirements with invalid password
  await TestValidator.error("password too short should fail", async () => {
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: {
          password: `${newPassword}:Short`, // Less than 8 characters
        } satisfies IRedditPlatformRegisteredUser.IUpdate,
      },
    );
  });

  // Step 4: Test current password verification - provide wrong current password
  await TestValidator.error("wrong current password should fail", async () => {
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: {
          password: `WrongPassword:${newPassword}`, // Incorrect current password
        } satisfies IRedditPlatformRegisteredUser.IUpdate,
      },
    );
  });

  // Step 5: Test successful update with complex new password
  const finalPassword = "FinalComplexPassword789!@#$";
  const finalUpdate: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: {
          password: `${newPassword}:${finalPassword}`,
        } satisfies IRedditPlatformRegisteredUser.IUpdate,
      },
    );
  typia.assert(finalUpdate);

  // Verify final update maintains user data integrity
  TestValidator.equals(
    "final update user ID preserved",
    finalUpdate.id,
    newUser.id,
  );
  TestValidator.equals(
    "final update username preserved",
    finalUpdate.username,
    newUser.username,
  );
  TestValidator.equals(
    "final update email preserved",
    finalUpdate.email,
    newUser.email,
  );
  TestValidator.notEquals(
    "user data updated timestamp",
    finalUpdate.updatedAt,
    newUser.updatedAt,
  );

  // Step 6: Verify profile fields can be updated alongside password
  const profileUpdate: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: {
          password: `${finalPassword}:TestPassword2024!`,
          display_name: "Updated Test User",
          bio: "Profile updated during password change test",
        } satisfies IRedditPlatformRegisteredUser.IUpdate,
      },
    );
  typia.assert(profileUpdate);

  // Validate both password and profile updates
  TestValidator.equals(
    "display name updated",
    profileUpdate.displayName,
    "Updated Test User",
  );
  TestValidator.equals(
    "bio updated",
    profileUpdate.bio,
    "Profile updated during password change test",
  );
  TestValidator.equals("user identity preserved", profileUpdate.id, newUser.id);
  TestValidator.equals(
    "email identity preserved",
    profileUpdate.email,
    newUser.email,
  );
}
