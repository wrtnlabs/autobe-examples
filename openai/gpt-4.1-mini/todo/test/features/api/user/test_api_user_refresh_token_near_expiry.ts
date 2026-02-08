import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_refresh_token_near_expiry(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins with empty body as per DTO schema
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  typia.assert(authorized);
  // 2. Refresh the token using the refresh utility on a new connection
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_user_refresh(refreshConnection, {
    body: {},
  });
  typia.assert(refreshed);
  // 3. Validate that a new token is issued
  TestValidator.notEquals(
    "access token should be rotated",
    authorized.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    authorized.token.refresh,
    refreshed.token.refresh,
  );
  // 4. Validate expiration timestamps: new expires must be after original
  const originalExpired = new Date(authorized.token.expired_at).getTime();
  const newExpired = new Date(refreshed.token.expired_at).getTime();
  TestValidator.predicate(
    "new access token expiry must be later",
    newExpired > originalExpired,
  );
  const originalRefreshable = new Date(
    authorized.token.refreshable_until,
  ).getTime();
  const newRefreshable = new Date(refreshed.token.refreshable_until).getTime();
  TestValidator.predicate(
    "new refresh token expiry must be later or equal",
    newRefreshable >= originalRefreshable,
  );
  // 5. Ensure that refresh connection's Authorization header updated automatically to new access token
  TestValidator.equals(
    "refresh connection authorization header updated",
    refreshConnection.headers?.Authorization,
    refreshed.token.access,
  );
}
