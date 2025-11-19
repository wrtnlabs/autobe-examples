import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthRefresh";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";

export async function test_api_registered_user_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Create a new registered user account
  const registeredUser: IDiscussionBoardRegisteredUser.IAuthorized =
    await api.functional.auth.registered_user.join(connection, {
      body: typia.random<IDiscussionBoardRegisteredUser.ICreate>(),
    });
  typia.assert(registeredUser);

  // Attempt to refresh with invalid token
  await TestValidator.error("invalid refresh token should fail", async () => {
    await api.functional.auth.registered_user.refresh(connection, {
      body: {
        refreshToken: "invalid-refresh-token",
      } satisfies IAuthRefresh.IRequest,
    });
  });
}
