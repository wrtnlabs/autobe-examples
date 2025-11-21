import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_login_password_no_number(
  connection: api.IConnection,
) {
  const invalidPassword = "NoNumbersHere!"; // Password lacks numeric digits
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  await TestValidator.error("password without number should fail", async () => {
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: invalidPassword,
      } satisfies ICommunityBBSModerator.ILogin,
    });
  });
}
