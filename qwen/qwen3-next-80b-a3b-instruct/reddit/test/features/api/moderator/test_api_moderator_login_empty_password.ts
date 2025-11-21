import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_login_empty_password(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "empty password should fail authentication",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "", // Empty password should trigger validation error
        } satisfies ICommunityBBSModerator.ILogin,
      });
    },
  );
}
