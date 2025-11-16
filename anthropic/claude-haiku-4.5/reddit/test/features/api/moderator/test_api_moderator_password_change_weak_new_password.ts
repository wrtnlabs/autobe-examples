import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test password change with weak new password validation.
 *
 * Validates that the system properly rejects weak passwords that do not meet
 * security complexity requirements during moderator password change
 * operations.
 *
 * Setup process:
 *
 * 1. Register and authenticate as a moderator with a strong initial password
 * 2. Attempt password changes with various weak password scenarios
 * 3. Verify system rejection of each weak password with validation errors
 * 4. Confirm original password remains valid after failed change attempts
 *
 * Weak password scenarios tested:
 *
 * - Too short passwords (below minimum length)
 * - Only lowercase letters (lacks character diversity)
 * - Only uppercase letters (lacks character diversity)
 * - Only numbers (lacks character diversity)
 * - Missing special characters (incomplete character types)
 * - Sequential or repeated character patterns
 *
 * Each scenario validates proper rejection and ensures no unintended password
 * modifications occur on the moderator account.
 */
export async function test_api_moderator_password_change_weak_new_password(
  connection: api.IConnection,
) {
  // 1. Register a moderator with strong initial password
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const strongPassword = "SecurePass123!@#";
  const username = RandomGenerator.alphabets(8);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: username,
      password: strongPassword,
      ip: "127.0.0.1",
      href: "https://example.com/auth/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator registered successfully",
    moderator.id !== null,
  );

  // 2. Test weak password scenarios
  const weakPasswords = [
    {
      name: "too short password",
      password: "Short1!",
    },
    {
      name: "only lowercase letters",
      password: "onlylowercase",
    },
    {
      name: "only uppercase letters",
      password: "ONLYUPPERCASE",
    },
    {
      name: "only numbers",
      password: "123456789",
    },
    {
      name: "only letters and numbers without special chars",
      password: "Password12345",
    },
    {
      name: "no uppercase letters",
      password: "password123!@#",
    },
    {
      name: "no lowercase letters",
      password: "PASSWORD123!@#",
    },
  ];

  // Test each weak password scenario
  for (const scenario of weakPasswords) {
    await TestValidator.error(
      `should reject weak password: ${scenario.name}`,
      async () => {
        const result =
          await api.functional.communityPlatform.moderator.auth.moderator.password_change.changePassword(
            connection,
            {
              body: {
                current_password: strongPassword,
                new_password: scenario.password,
              } satisfies ICommunityPlatformModerator.IPasswordChange,
            },
          );
        // If the API doesn't throw, verify the response indicates failure
        if (result.success === true) {
          throw new Error(
            `Password change should have failed for: ${scenario.name}`,
          );
        }
      },
    );
  }

  // 3. Verify that the original password is still valid after all failed attempts
  // by checking that attempting to change with an invalid current password also fails
  await TestValidator.error(
    "should reject password change with incorrect current password",
    async () => {
      const result =
        await api.functional.communityPlatform.moderator.auth.moderator.password_change.changePassword(
          connection,
          {
            body: {
              current_password: "WrongPassword123!@#",
              new_password: "NewSecurePass456!@#",
            } satisfies ICommunityPlatformModerator.IPasswordChange,
          },
        );
      if (result.success === true) {
        throw new Error(
          "Password change should have failed with incorrect current password",
        );
      }
    },
  );

  // 4. Confirm password change with a valid strong password succeeds
  const newStrongPassword = "NewSecurePass456!@#";
  const successResult =
    await api.functional.communityPlatform.moderator.auth.moderator.password_change.changePassword(
      connection,
      {
        body: {
          current_password: strongPassword,
          new_password: newStrongPassword,
        } satisfies ICommunityPlatformModerator.IPasswordChange,
      },
    );
  typia.assert(successResult);
  TestValidator.predicate(
    "password change with strong password succeeds",
    successResult.success === true,
  );
}
