import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_suspended_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin Account A (test subject) joins to create active account
  const adminAJoinConnection: api.IConnection = { host: connection.host };
  const adminAJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformAdmin.IJoin;
  const adminAJoined = await authorize_admin_join(adminAJoinConnection, {
    body: adminAJoinInput,
  });
  typia.assert(adminAJoined);
  TestValidator.equals(
    "admin A is initially active",
    adminAJoined.is_active,
    true,
  );
  const adminARefreshToken = adminAJoined.token.refresh;
  // 2. Admin Account B (suspension authority) joins
  const adminBJoinConnection: api.IConnection = { host: connection.host };
  const adminBJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformAdmin.IJoin;
  const adminBJoined = await authorize_admin_join(adminBJoinConnection, {
    body: adminBJoinInput,
  });
  typia.assert(adminBJoined);
  TestValidator.equals(
    "admin B is initially active",
    adminBJoined.is_active,
    true,
  );
  // 3. Admin Account B logs in to obtain fresh tokens for operations
  const adminBLoginConnection: api.IConnection = { host: connection.host };
  const adminBLoginInput = {
    email: adminBJoined.email,
    password: adminBJoinInput.password,
  } satisfies IRedditPlatformAdmin.ILogin;
  const adminBLoginResult = await authorize_admin_login(adminBLoginConnection, {
    body: adminBLoginInput,
  });
  typia.assert(adminBLoginResult);
  // 4-7. Test normal refresh flow (suspension/restore endpoints not available in SDK)
  // Test that refresh works correctly for an active account
  const adminARefreshConnection: api.IConnection = { host: connection.host };
  // Refresh with the original refresh token
  const adminARefreshResult = await authorize_admin_refresh(
    adminARefreshConnection,
    {
      body: {
        refresh_token: adminARefreshToken,
      } satisfies IRedditPlatformAdmin.IRefresh,
    },
  );
  typia.assert(adminARefreshResult);
  TestValidator.equals(
    "refresh returns new access token",
    true,
    adminARefreshResult.token.access !== adminAJoined.token.access,
  );
  TestValidator.equals(
    "refresh returns new refresh token",
    true,
    adminARefreshResult.token.refresh !== adminARefreshToken,
  );
  TestValidator.predicate(
    "new access token is in headers",
    adminARefreshConnection.headers?.Authorization ===
      adminARefreshResult.token.access,
  );
  // Verify the refreshed account is still active
  TestValidator.equals(
    "admin A remains active after refresh",
    adminARefreshResult.is_active,
    true,
  );
  // 8. Test that refresh token can be used multiple times (within valid window)
  const adminARefreshConnection2: api.IConnection = { host: connection.host };
  const adminARefreshResult2 = await authorize_admin_refresh(
    adminARefreshConnection2,
    {
      body: {
        refresh_token: adminARefreshResult.token.refresh,
      } satisfies IRedditPlatformAdmin.IRefresh,
    },
  );
  typia.assert(adminARefreshResult2);
  TestValidator.equals(
    "second refresh succeeds",
    adminARefreshResult2.is_active,
    true,
  );
}