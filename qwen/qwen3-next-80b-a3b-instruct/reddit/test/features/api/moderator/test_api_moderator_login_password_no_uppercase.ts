import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_login_password_no_uppercase(
  connection: api.IConnection,
) {
  // Generate a valid email for a moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();

  // Generate a password that violates the uppercase requirement (all lowercase)
  const invalidPassword: string =
    RandomGenerator.alphaNumeric(12).toLowerCase();

  // Validate that the password contains no uppercase letters (as per test scenario)
  TestValidator.predicate(
    "password contains no uppercase letters",
    !/[A-Z]/.test(invalidPassword),
  );

  // Attempt to login with password missing uppercase letters
  // This should trigger a 400 Bad Request error due to password policy violation
  await TestValidator.error(
    "login should fail with password missing uppercase letter",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: moderatorEmail,
          password: invalidPassword,
        } satisfies ICommunityBBSModerator.ILogin,
      });
    },
  );
}
