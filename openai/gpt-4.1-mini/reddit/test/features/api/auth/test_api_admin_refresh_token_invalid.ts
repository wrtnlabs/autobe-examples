import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_token_invalid(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the failure path where an admin tries to refresh a JWT token
  // using an invalid or expired refresh token.
  // 1. Create a new admin user and obtain authorized tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {}, // Empty body as per ICommunityPlatformAdmin.IJoin definition
  });
  typia.assert(admin);
  // 2. Prepare an invalid refresh token string to simulate expired or invalid token
  const invalidRefreshToken = "invalid-refresh-token-1234567890";
  // 3. Create a new connection object for the refresh attempt
  const refreshConnection: api.IConnection = { host: connection.host };
  // Manipulate headers to include an invalid Authorization Bearer token
  // because the IRefresh DTO does not accept any body properties.
  refreshConnection.headers = {
    Authorization: `Bearer ${invalidRefreshToken}`,
  };
  // 4. Attempt to refresh using the invalid refresh token
  // The request tries to refresh with invalid token, so expect an HTTP 401 Unauthorized error
  await TestValidator.httpError(
    "admin refresh token invalid",
    401,
    async () => {
      await authorize_admin_refresh(refreshConnection, {
        body: {},
      });
    },
  );
}
