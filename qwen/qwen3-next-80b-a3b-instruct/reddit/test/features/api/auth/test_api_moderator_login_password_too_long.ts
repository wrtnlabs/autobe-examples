import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_login_password_too_long(
  connection: api.IConnection,
) {
  // Generate a password exceeding the maximum 128 character limit
  const tooLongPassword = RandomGenerator.alphaNumeric(129); // Password with 129 characters

  // Create login credentials with excessively long password
  const invalidLogin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: tooLongPassword,
  } satisfies ICommunityBBSModerator.ILogin;

  // Verify that API rejects login attempt with password exceeding 128 characters
  await TestValidator.error(
    "moderator login should fail with password longer than 128 characters",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: invalidLogin,
      });
    },
  );
}
