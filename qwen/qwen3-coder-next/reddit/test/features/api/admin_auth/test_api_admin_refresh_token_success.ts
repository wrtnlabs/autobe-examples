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

export async function test_api_admin_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
    username: RandomGenerator.name(2),
    display_name: null,
    bio: null,
  } satisfies IRedditPlatformAdmin.IJoin;
  const registeredAdmin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(registeredAdmin);
  // Step 2: Login to obtain refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_admin_login(loginConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  typia.assert(loginResponse);
  // Verify refresh token exists
  TestValidator.predicate(
    "login response has refresh token",
    typeof loginResponse.token.refresh === "string",
  );
  // Step 3: Use refresh token to get new tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh_token: loginResponse.token.refresh,
    } satisfies IRedditPlatformAdmin.IRefresh,
  });
  typia.assert(refreshResponse);
  // Step 4: Validate response structure
  typia.assert<IRedditPlatformAdmin.IAuthorized>(refreshResponse);
  // Verify token structure
  TestValidator.predicate(
    "has access token",
    typeof refreshResponse.token.access === "string",
  );
  TestValidator.predicate(
    "has refresh token",
    typeof refreshResponse.token.refresh === "string",
  );
  TestValidator.predicate(
    "access token is non-empty",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    refreshResponse.token.refresh.length > 0,
  );
  // Verify expiration timestamps exist
  TestValidator.predicate(
    "has expired_at",
    typeof refreshResponse.token.expired_at === "string",
  );
  TestValidator.predicate(
    "has refreshable_until",
    typeof refreshResponse.token.refreshable_until === "string",
  );
  // Validate admin details
  TestValidator.predicate("has id", typeof refreshResponse.id === "string");
  TestValidator.predicate(
    "has email",
    typeof refreshResponse.email === "string",
  );
  TestValidator.predicate(
    "has username",
    typeof refreshResponse.username === "string",
  );
  // Verify email matches original
  TestValidator.equals(
    "email matches original",
    refreshResponse.email,
    adminCredentials.email,
  );
  TestValidator.equals(
    "username matches original",
    refreshResponse.username,
    adminCredentials.username,
  );
}
