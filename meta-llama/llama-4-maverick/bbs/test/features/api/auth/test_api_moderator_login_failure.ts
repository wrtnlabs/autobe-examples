import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_login_failure(
  connection: api.IConnection,
) {
  const invalidCredentials: IDiscussionBoardModerator.ILogin = {
    usernameOrEmail: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(8),
  } satisfies IDiscussionBoardModerator.ILogin;
  await TestValidator.httpError(
    "moderator login should fail with invalid credentials and return 401",
    401,
    async () =>
      await api.functional.auth.moderator.login(connection, {
        body: invalidCredentials,
      }),
  );
}
