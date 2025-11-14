import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_password_length_minimum(
  connection: api.IConnection,
) {
  // Generate password that is 7 characters long (below minimum)
  const shortPassword = RandomGenerator.alphabets(7);

  // Verify that login with short password fails with 400 Bad Request
  await TestValidator.error(
    "login with password shorter than minimum length should fail",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: shortPassword,
      });
    },
  );
}
