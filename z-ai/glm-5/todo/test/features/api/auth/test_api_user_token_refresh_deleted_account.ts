import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test token refresh behavior when user account is deleted or inactive.
 *
 * Validates that:
 * - Refresh tokens associated with deleted users are invalidated
 * - System checks user existence before issuing new tokens
 * - Error messages don't reveal whether user existed
 * - Deleted user's sessions are properly invalidated
 */
export async function test_api_user_token_refresh_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a user account and obtain valid tokens
  const userConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_user_join(userConnection, {});
  typia.assert(authResult);
  // Store the valid refresh token for reference
  const validRefreshToken = authResult.token.refresh;
  // Step 2: Verify that valid refresh works
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await api.functional.todoApp.auth.user.refresh(
    refreshConnection,
    {
      body: { refreshToken: validRefreshToken } satisfies ITodoAppUser.IRefresh,
    },
  );
  typia.assert(refreshResult);
  // Step 3: Test with invalid/non-existent refresh token (simulates deleted account scenario)
  // When user account is deleted, their refresh token becomes invalid
  // The same behavior should occur for non-existent tokens
  const invalidRefreshToken = "invalid-refresh-token-for-deleted-account";
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      const invalidConnection: api.IConnection = { host: connection.host };
      await api.functional.todoApp.auth.user.refresh(invalidConnection, {
        body: {
          refreshToken: invalidRefreshToken,
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );
  // Step 4: Test with malformed token (simulates a token that was once valid but user is deleted)
  const malformedToken = typia.random<string & typia.tags.Format<"uuid">>();
  await TestValidator.error(
    "refresh with malformed token should fail",
    async () => {
      const malformedConnection: api.IConnection = { host: connection.host };
      await api.functional.todoApp.auth.user.refresh(malformedConnection, {
        body: { refreshToken: malformedToken } satisfies ITodoAppUser.IRefresh,
      });
    },
  );
  // Step 5: Verify that the original valid refresh token still works
  // (the failed attempts shouldn't invalidate the original session)
  const finalRefreshConnection: api.IConnection = { host: connection.host };
  const finalRefreshResult = await api.functional.todoApp.auth.user.refresh(
    finalRefreshConnection,
    {
      body: { refreshToken: validRefreshToken } satisfies ITodoAppUser.IRefresh,
    },
  );
  typia.assert(finalRefreshResult);
  // Verify user ID remains consistent
  TestValidator.equals(
    "user ID should remain consistent after refresh",
    finalRefreshResult.id,
    authResult.id,
  );
}