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

export async function test_api_admin_refresh_token_invalid(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register an admin first to get valid tokens
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
    username: RandomGenerator.name(),
    display_name: null,
    bio: null,
  } satisfies IRedditPlatformAdmin.IJoin;
  const authorized = await authorize_admin_join(adminConnection, {
    body: credentials,
  });
  typia.assert(authorized);
  // Create new connection with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh_token: authorized.token.refresh,
    } satisfies IRedditPlatformAdmin.IRefresh,
  });
  typia.assert(refreshConnection.headers?.Authorization);
  // Reset connection to test invalid refresh token
  const invalidConnection: api.IConnection = { host: connection.host };
  // Test 1: Malformed refresh token
  await TestValidator.error("malformed refresh token", async () => {
    await api.functional.redditPlatform.auth.admin.refresh(invalidConnection, {
      body: {
        refresh_token: "malformed-token",
      } satisfies IRedditPlatformAdmin.IRefresh,
    });
  });
  // Test 2: Empty refresh token
  await TestValidator.error("empty refresh token", async () => {
    await api.functional.redditPlatform.auth.admin.refresh(invalidConnection, {
      body: {
        refresh_token: "",
      } satisfies IRedditPlatformAdmin.IRefresh,
    });
  });
  // Test 3: Expired refresh token (simulate by creating new session and using old token)
  // First create a new session to invalidate the old token
  const newConnection: api.IConnection = { host: connection.host };
  const newAuthorized = await authorize_admin_refresh(newConnection, {
    body: {
      refresh_token: authorized.token.refresh,
    } satisfies IRedditPlatformAdmin.IRefresh,
  });
  typia.assert(newAuthorized);
  // Now try to use the old token (should fail)
  await TestValidator.error("expired refresh token", async () => {
    await api.functional.redditPlatform.auth.admin.refresh(invalidConnection, {
      body: {
        refresh_token: authorized.token.refresh,
      } satisfies IRedditPlatformAdmin.IRefresh,
    });
  });
  // Verify no new tokens were issued for invalid refresh attempts
  TestValidator.predicate("no unauthorized tokens issued", () => {
    return invalidConnection.headers?.Authorization === undefined;
  });
}
