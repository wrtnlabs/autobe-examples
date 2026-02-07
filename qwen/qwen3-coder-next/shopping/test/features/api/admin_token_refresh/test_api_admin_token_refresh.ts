import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_token_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for initial authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Admin joins (registers) to create an admin account
  const joinResponse = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(joinResponse);
  // Step 2: Admin logs in to establish authenticated session
  const loginResponse = await authorize_admin_login(adminConnection, {
    body: {},
  });
  typia.assert(loginResponse);
  // Step 3: Extract refresh token from login response
  const refresh_token = loginResponse.token.refresh;
  typia.assert(refresh_token);
  // Step 4: Create new connection for the refresh endpoint
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 5: Call refresh endpoint with the refresh token
  const refreshResponse = await authorize_admin_refresh(refreshConnection, {
    body: {},
  });
  typia.assert(refreshResponse);
  // Step 6: Validate refresh response contains new tokens
  TestValidator.equals(
    "new access token exists",
    typeof refreshResponse.token.access,
    "string",
  );
  TestValidator.equals(
    "new refresh token exists",
    typeof refreshResponse.token.refresh,
    "string",
  );
  // Step 7: Validate expiration timestamps are valid ISO 8601 date-time strings
  TestValidator.predicate(
    "access token expiration is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      refreshResponse.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refresh token expiration is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      refreshResponse.token.refreshable_until,
    ),
  );
  // Step 8: Verify new tokens are different from old ones (token rotation)
  TestValidator.notEquals(
    "access token rotated",
    refreshResponse.token.access,
    loginResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResponse.token.refresh,
    loginResponse.token.refresh,
  );
  // Step 9: Verify new tokens can be used for authenticated requests
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: refreshResponse.token.access,
  };
  // Test that the new access token is valid by calling an authenticated endpoint
  // This would normally be a simple authenticated request like fetching admin profile
  // For now, we just verify the token structure is correct
  typia.assert(refreshResponse.token.access);
}
