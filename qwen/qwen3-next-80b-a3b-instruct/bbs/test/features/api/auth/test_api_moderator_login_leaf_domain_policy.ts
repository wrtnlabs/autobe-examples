import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_leaf_domain_policy(
  connection: api.IConnection,
) {
  const invalidEmail = "test@gmail.com";
  await TestValidator.error(
    "login with public domain email should be rejected",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: invalidEmail,
      });
    },
  );
}
