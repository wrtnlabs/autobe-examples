import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_too_long_email(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "email longer than 254 characters should fail",
    async () => {
      const longEmail = RandomGenerator.alphaNumeric(255) + "@domain.com";
      await api.functional.auth.moderator.login(connection, {
        body: longEmail satisfies IPoliticalForumModerator.ILogin,
      });
    },
  );
}
