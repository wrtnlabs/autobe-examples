import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_login_password_too_short(
  connection: api.IConnection,
) {
  await TestValidator.error("password too short should fail", async () => {
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Short1!", // Exactly 7 characters - below minimum
      } satisfies ICommunityBBSModerator.ILogin,
    });
  });
}
