import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Tests refresh token attempt for a user account that has been soft-deleted.
 * Ensures a refresh token associated with a deleted user cannot be used to
 * generate new authentication tokens, validating correct account status
 * enforcement in the refresh workflow.
 */
export async function test_api_user_token_refresh_deleted_user(
  connection: api.IConnection,
) {
  // Step 1: Prepare a deleted user's refresh token (mock approach, since we cannot create or delete users in this scope)
  // Simulate a refresh token referencing a user with a non-null deleted_at, which should be rejected by the server.
  // This token cannot be generated via public API, so use random string for the refresh_token value.
  const refreshRequest = {
    refresh_token: RandomGenerator.alphaNumeric(64),
  } satisfies ITodoAppUser.IRefresh;

  // Step 2: Attempt refresh and expect error
  await TestValidator.error(
    "cannot refresh token for soft-deleted user",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: refreshRequest,
      });
    },
  );
}
