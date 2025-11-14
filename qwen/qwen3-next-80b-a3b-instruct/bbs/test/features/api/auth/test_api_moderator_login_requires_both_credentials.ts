import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_requires_both_credentials(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "empty request body should return 400",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: "" satisfies IPoliticalForumModerator.ILogin,
      });
    },
  );

  await TestValidator.error(
    "request with only email in JSON string should return 400",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: JSON.stringify({
          email: typia.random<string & tags.Format<"email">>(),
        }) satisfies IPoliticalForumModerator.ILogin,
      });
    },
  );

  await TestValidator.error(
    "request with only password in JSON string should return 400",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: JSON.stringify({
          password: RandomGenerator.alphaNumeric(12),
        }) satisfies IPoliticalForumModerator.ILogin,
      });
    },
  );
}
