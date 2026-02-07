import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user account to obtain refresh token
  const newUserConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_user_join(newUserConnection, {
    body: {},
  });
  typia.assert(joined);
  // Step 2: Use the refresh token to obtain new access and refresh tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_user_refresh(refreshConnection, {
    body: {
      refresh: joined.token.refresh,
    },
  });
  typia.assert(refreshed);
  // Step 3: Validate that the new access token is issued and different from original
  TestValidator.notEquals(
    "new access token is different from original",
    joined.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "new refresh token is different from original",
    joined.token.refresh,
    refreshed.token.refresh,
  );
  // Step 4: Validate token expiration metadata (both tokens have valid dates)
  const now = new Date().toISOString();
  TestValidator.predicate("new access token expires in 15 minutes", () => {
    const expires = new Date(refreshed.token.expired_at);
    const nowDate = new Date(now);
    const diffMs = expires.getTime() - nowDate.getTime();
    return diffMs > 15 * 60 * 1000 && diffMs < 20 * 60 * 1000;
  });
  TestValidator.predicate("new refresh token is valid for 7 days", () => {
    const refreshUntil = new Date(refreshed.token.refreshable_until);
    const nowDate = new Date(now);
    const diffMs = refreshUntil.getTime() - nowDate.getTime();
    return diffMs > 7 * 24 * 60 * 60 * 1000 && diffMs < 8 * 24 * 60 * 60 * 1000;
  });
}
