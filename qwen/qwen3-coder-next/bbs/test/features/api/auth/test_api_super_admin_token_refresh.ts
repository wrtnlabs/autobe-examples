import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_token_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for super admin operations
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Step 1: Register super admin account
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  // Step 2: Login to create valid session with refresh token
  const loginResponse =
    await api.functional.discussionBoard.auth.super_admin.login(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.ILogin>(),
      },
    );
  typia.assert(loginResponse);
  // Step 3: Store original tokens for comparison
  const originalRefreshToken = loginResponse.token.refresh;
  // Step 4: Wait a small amount of time to ensure token refresh will generate new tokens
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Step 5: Refresh tokens using the refresh token
  const refreshResponse =
    await api.functional.discussionBoard.auth.super_admin.refresh(
      superAdminConnection,
      {
        body: {
          refresh: originalRefreshToken,
        } satisfies IDiscussionBoardSuperAdmin.IRefresh,
      },
    );
  typia.assert(refreshResponse);
  // Step 6: Validate that new tokens were generated
  TestValidator.notEquals(
    "access token should be different after refresh",
    loginResponse.token.access,
    refreshResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different after refresh",
    loginResponse.token.refresh,
    refreshResponse.token.refresh,
  );
  // Step 7: Verify new access token works
  const newConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: refreshResponse.token.access,
    },
  };
  // Confirm new token is valid by making a simple authenticated request
  const newRefreshResponse =
    await api.functional.discussionBoard.auth.super_admin.refresh(
      newConnection,
      {
        body: {
          refresh: refreshResponse.token.refresh,
        } satisfies IDiscussionBoardSuperAdmin.IRefresh,
      },
    );
  typia.assert(newRefreshResponse);
}
