import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_token_refresh_success(
  connection: api.IConnection,
) {
  const loginResponse = await api.functional.auth.moderator.login(connection, {
    body: {
      usernameOrEmail: RandomGenerator.name(),
      password: "P@ssw0rd!",
    } satisfies IDiscussionBoardModerator.ILogin,
  });
  typia.assert(loginResponse);

  const refreshResponse = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: loginResponse.token
        .refresh satisfies IDiscussionBoardModerator.IRefresh,
    },
  );
  typia.assert(refreshResponse);

  TestValidator.notEquals(
    "New access token should be different",
    loginResponse.token.access,
    refreshResponse.token.access,
  );
  TestValidator.equals(
    "Refresh token should remain same",
    loginResponse.token.refresh,
    refreshResponse.token.refresh,
  );
}
