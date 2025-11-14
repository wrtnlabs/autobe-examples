import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_password_contain_symbol(
  connection: api.IConnection,
) {
  // Generate 5 different alphanumeric-only passwords for testing
  const alphanumericPasswords = ArrayUtil.repeat(5, () => {
    // Generate random alphanumeric string (no symbols)
    return RandomGenerator.alphaNumeric(12);
  });

  // Test each password with only alphanumeric characters
  for (const password of alphanumericPasswords) {
    await TestValidator.httpError(
      "password without special symbol should return 400 Bad Request",
      400,
      async () => {
        await api.functional.auth.moderator.login(connection, {
          body: password, // ILogin is string type, so direct string assignment
        });
      },
    );
  }
}
