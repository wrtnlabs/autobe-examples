import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_password_contain_uppercase(
  connection: api.IConnection,
) {
  // Generate a password with only lowercase letters and numbers (no uppercase)
  // Combine lowercase letters and digits with guaranteed no uppercase
  const lowercaseLetters = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const allAllowedChars = lowercaseLetters + digits;

  // Generate a 12-character password using only allowed characters
  const invalidPassword = ArrayUtil.repeat(12, () =>
    RandomGenerator.pick([...allAllowedChars]),
  ).join("");

  // Verify that the generated password contains no uppercase letters
  // This is important for validating our test setup
  TestValidator.predicate(
    "generated password contains no uppercase letters",
    !/[A-Z]/.test(invalidPassword),
  );

  // Try to login with invalid password (no uppercase letters)
  await TestValidator.error(
    "login should fail for password without uppercase letter",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: invalidPassword,
      });
    },
  );
}
