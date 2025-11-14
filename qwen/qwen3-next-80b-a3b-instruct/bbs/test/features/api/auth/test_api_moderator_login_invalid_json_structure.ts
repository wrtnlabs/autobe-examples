import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_invalid_json_structure(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "invalid JSON syntax with trailing comma should fail",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: '{"email": "test@example.com", "password": "1234",}', // Trailing comma in JSON string
      });
    },
  );

  await TestValidator.error(
    "invalid JSON syntax with unquoted key should fail",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: '{email: "test@example.com", "password": "1234"}', // Unquoted key in JSON string
      });
    },
  );

  await TestValidator.error(
    "invalid JSON syntax with missing closing brace should fail",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: '{"email": "test@example.com", "password": "1234"', // Missing closing brace in JSON string
      });
    },
  );
}
