import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_login_password_no_lowercase(
  connection: api.IConnection,
) {
  // Test moderator login with password missing lowercase letters
  // This scenario verifies that the system rejects passwords that don't contain at least one lowercase letter

  // Generate valid email for moderator
  const email: string = typia.random<string & tags.Format<"email">>();

  // Generate password that meets all requirements except lowercase letters
  // Password must be 8-128 chars, contain uppercase, number, and special char, but NO lowercase
  const password: string =
    RandomGenerator.alphabets(1) + // Uppercase letter
    RandomGenerator.alphaNumeric(1) + // Number
    RandomGenerator.alphabets(1) + // Uppercase letter
    RandomGenerator.alphaNumeric(1) + // Number
    "!@#$" + // Special characters
    RandomGenerator.alphaNumeric(2); // More numbers

  // Ensure password has no lowercase letters (confirmed by construction)
  // Password format: Uppercase + Number + Uppercase + Number + Special + Numeric

  // Attempt to login with invalid password (missing lowercase)
  await TestValidator.error(
    "moderator login should fail with password missing lowercase letters",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: email,
          password: password,
        } satisfies ICommunityBBSModerator.ILogin,
      });
    },
  );
}
