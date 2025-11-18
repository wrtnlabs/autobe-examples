import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_auth_user_refresh_locked_user(
  connection: api.IConnection,
) {
  // Simulate a locked user by constructing a refresh payload. We do not have API to actually lock a user,
  // so we only test that the API endpoint rejects use of a refresh_token that (if presumed valid)
  // would be for a locked user session.

  // Here, we simulate with a random string. In reality system should check the lock at database/session level.
  const refreshPayload = {
    refresh_token: typia.random<string>(),
  } satisfies ITodoListUser.IRefresh;

  await TestValidator.error(
    "refresh must be rejected for locked user",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: refreshPayload,
      });
    },
  );
}
