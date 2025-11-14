import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_rejects_other_schemes(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "unauthenticated access should lack authorization header",
    async () => {
      await api.functional.auth.moderator.login(
        { ...connection, headers: {} },
        { body: typia.random<IPoliticalForumModerator.ILogin>() },
      );
    },
  );
}
