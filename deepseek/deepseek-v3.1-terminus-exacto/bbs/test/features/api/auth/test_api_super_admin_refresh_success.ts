import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test successful token refresh after initial authentication.
 * 1. Create super admin account via join
 * 2. Login to get initial access and refresh tokens
 * 3. Refresh tokens to validate rotation and new token issuance
 * 4. Verify new tokens work for subsequent operations
 */
export async function test_api_super_admin_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_super_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // Step 2: Login with created credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_super_admin_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  typia.assert(loginResult);
  // Step 3: Refresh tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_super_admin_refresh(refreshConnection, {
    body: {
      refresh_token: loginResult.token.refresh,
    },
  });
  typia.assert(refreshResult);
  // Step 4: Validate token rotation and identity preservation
  TestValidator.notEquals(
    "refresh returns new access token",
    refreshResult.token.access,
    loginResult.token.access,
  );
  TestValidator.notEquals(
    "refresh returns new refresh token",
    refreshResult.token.refresh,
    loginResult.token.refresh,
  );
  TestValidator.equals(
    "super admin id remains consistent",
    refreshResult.id,
    loginResult.id,
  );
  TestValidator.equals(
    "email remains consistent",
    refreshResult.email,
    loginResult.email,
  );
  // Step 5: Verify new tokens work for authenticated operations
  // Create new connection with refreshed token
  const newConnection: api.IConnection = { host: connection.host };
  newConnection.headers = { Authorization: refreshResult.token.access };
  // Attempt another refresh with the new refresh token to verify it works
  const secondRefreshResult = await authorize_super_admin_refresh(
    newConnection,
    {
      body: {
        refresh_token: refreshResult.token.refresh,
      },
    },
  );
  typia.assert(secondRefreshResult);
  // Verify that token rotation continues to work
  TestValidator.notEquals(
    "second refresh also returns new access token",
    secondRefreshResult.token.access,
    refreshResult.token.access,
  );
  TestValidator.equals(
    "account identity remains consistent through second refresh",
    secondRefreshResult.id,
    refreshResult.id,
  );
}
