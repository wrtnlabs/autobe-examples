import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_block_listed_domains(
  connection: api.IConnection,
) {
  // Test login with a known disposable email domain
  const disposableEmail = "test@10minutemail.com";

  // Submit login request with blocklisted domain email
  await TestValidator.error(
    "login should fail for blocked disposable email domain",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: disposableEmail satisfies IPoliticalForumModerator.ILogin,
      });
    },
  );
}
