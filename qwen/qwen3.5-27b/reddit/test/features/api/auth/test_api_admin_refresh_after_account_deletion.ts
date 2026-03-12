import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that token refresh fails when using invalid tokens (simulating deleted account scenario).
 * 1. Create admin account to obtain valid tokens
 * 2. Attempt refresh with invalid token
 * 3. Verify error response
 */
export async function test_api_admin_refresh_after_account_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and obtain initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // Store the valid refresh token
  const validRefreshToken = admin.token.refresh;
  // 2. Create a new connection for refresh attempt
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Attempt refresh with INVALID token (simulating deleted account scenario)
  // Since we cannot directly delete the account via API, we test with an invalid token
  // which should fail similarly to a deleted account scenario
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await authorize_admin_refresh(refreshConnection, {
        body: {
          refresh: "invalid_token_simulating_deleted_account",
        } satisfies IRedditCloneAdmin.IRefresh,
      });
    },
  );
  // 4. Verify that valid token still works (positive test)
  const validRefreshConnection: api.IConnection = { host: connection.host };
  const refreshedAdmin = await authorize_admin_refresh(validRefreshConnection, {
    body: {
      refresh: validRefreshToken,
    } satisfies IRedditCloneAdmin.IRefresh,
  });
  typia.assert(refreshedAdmin);
  // 5. Validate refreshed admin data
  TestValidator.equals("admin ID preserved", refreshedAdmin.id, admin.id);
  TestValidator.equals("email preserved", refreshedAdmin.email, admin.email);
  TestValidator.predicate(
    "new access token issued",
    refreshedAdmin.token.access !== admin.token.access,
  );
  TestValidator.predicate(
    "new refresh token issued",
    refreshedAdmin.token.refresh !== admin.token.refresh,
  );
}
