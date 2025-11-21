import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_login_invalid_password(
  connection: api.IConnection,
) {
  // Generate valid moderator email with RFC 5322 format
  const validEmail = typia.random<string & tags.Format<"email">>();

  // Generate invalid password (below minimum length of 8)
  const invalidPassword = "short"; // 5 characters - violates 8-128 constraint

  // Expected to throw 401 Unauthorized error due to invalid credential combination
  await TestValidator.error(
    "invalid password should fail authentication",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: validEmail,
          password: invalidPassword,
        } satisfies ICommunityBBSModerator.ILogin,
      });
    },
  );
}
