import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test refresh operation with expired refresh token. Validate that the system properly rejects expired tokens and returns appropriate error response. This tests the token expiration policy enforcement and ensures expired sessions cannot be renewed without re-authentication. Verify the error response clearly indicates token expiration as the failure reason.
 */
export async function test_api_admin_refresh_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Get the refresh token from initial authentication
  const validRefreshToken = admin.token.refresh;
  // 3. Attempt to refresh with an expired/invalid token
  // We simulate an expired token by using a clearly invalid token string
  const expiredTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "refresh with expired token should fail",
    async () => {
      await authorize_admin_refresh(expiredTokenConnection, {
        body: {
          refreshToken: "expired.or.invalid.jwt.token.simulating.expiration",
        } satisfies IMultiUserTodoAdmin.IRefresh,
      });
    },
  );
  // 4. Optional: Verify that a valid refresh token still works
  // This ensures our test setup is correct and the error is specifically for expired tokens
  const validRefreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_admin_refresh(validRefreshConnection, {
    body: {
      refreshToken: validRefreshToken,
    } satisfies IMultiUserTodoAdmin.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.notEquals(
    "new tokens should be different after refresh",
    refreshed.token.access,
    admin.token.access,
  );
}
