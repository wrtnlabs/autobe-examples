import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
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
  // 1. Admin join to create account
  const adminConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(joinResult);
  // 2. Admin login to obtain refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email:
        joinResult.token.access.split(".")[0].length > 0
          ? joinResult.token.access
          : "admin@example.com", // fallback
      password: password,
    } satisfies IRedditLikeAdmin.ILogin,
  });
  typia.assert(loginResult);
  // 3. Admin refresh token to get new tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh: loginResult.token.refresh,
    } satisfies IRedditLikeAdmin.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Verify new tokens are generated (different from original)
  TestValidator.notEquals(
    "new access token differs",
    refreshResult.token.access,
    loginResult.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs",
    refreshResult.token.refresh,
    loginResult.token.refresh,
  );
  TestValidator.predicate(
    "new access token valid",
    /^[A-Za-z0-9_-]+$/.test(refreshResult.token.access),
  );
  TestValidator.predicate(
    "new refresh token valid",
    /^[A-Za-z0-9_-]+$/.test(refreshResult.token.refresh),
  );
  TestValidator.predicate(
    "new access token not empty",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token not empty",
    refreshResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    new Date(refreshResult.token.expired_at).toISOString() ===
      refreshResult.token.expired_at,
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    new Date(refreshResult.token.refreshable_until).toISOString() ===
      refreshResult.token.refreshable_until,
  );
}
