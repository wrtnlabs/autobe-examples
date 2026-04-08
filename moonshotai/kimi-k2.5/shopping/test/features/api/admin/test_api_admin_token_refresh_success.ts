import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin token refresh success scenario.
 * 1. Admin joins and logs in to obtain initial tokens.
 * 2. Use refresh_token from login to call refresh endpoint.
 * 3. Validate response contains new IEcommerceMallAdmin.IAuthorized.
 * 4. Verify new access_token is different from previous one.
 */
export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Store password for later use
  const password: string = RandomGenerator.alphaNumeric(16);
  // Step 1: Create admin account - use join to establish admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      password,
    },
  });
  typia.assert(joinResult);
  // Step 2: Login to get initial access_token and refresh_token
  const loginResult = await authorize_admin_login(adminConnection, {
    body: {
      email: joinResult.email,
      password,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(loginResult);
  // Store old tokens for comparison
  const oldAccessToken: string = loginResult.token.access;
  const oldRefreshToken: string = loginResult.token.refresh;
  // Step 3: Create fresh connection and use refresh token to get new tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh: oldRefreshToken,
    } satisfies IEcommerceMallAdmin.IRefresh,
  });
  typia.assert(refreshResult);
  // Step 4: Validate response structure and content
  TestValidator.equals("admin id matches", refreshResult.id, loginResult.id);
  TestValidator.equals(
    "admin email matches",
    refreshResult.email,
    loginResult.email,
  );
  TestValidator.equals(
    "admin grade matches",
    refreshResult.grade,
    loginResult.grade,
  );
  TestValidator.equals(
    "admin status matches",
    refreshResult.status,
    loginResult.status,
  );
  // Step 5: Verify new access_token is different from previous one
  TestValidator.notEquals(
    "new access token differs from old access token",
    refreshResult.token.access,
    oldAccessToken,
  );
}
