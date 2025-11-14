import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_password_contain_number(
  connection: api.IConnection,
) {
  const invalidPassword = RandomGenerator.alphabets(12); // Generate password with only letters, no numbers

  // Attempt login with invalid password (no digits)
  await TestValidator.error(
    "login should fail with password containing no numbers",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: invalidPassword,
      });
    },
  );
}
