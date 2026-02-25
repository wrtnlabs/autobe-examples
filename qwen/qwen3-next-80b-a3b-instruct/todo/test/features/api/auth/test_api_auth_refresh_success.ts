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

export async function test_api_auth_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user and obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_user_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Extract refresh token from join response
  const refreshToken = joinResponse.token.refresh;
  // 3. Create refresh connection with the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_user_refresh(refreshConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies ITodoAppUser.IRefresh,
  });
  typia.assert(refreshResponse);
  // 4. Validate that new access token is different from original
  TestValidator.notEquals(
    "new access token differs from original",
    joinResponse.token.access,
    refreshResponse.token.access,
  );
  // 5. Validate that new refresh token is different (rotated)
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshToken,
    refreshResponse.token.refresh,
  );
  // 6. Validate expiration times are in the future and follow expected patterns
  const now = new Date().toISOString();
  // Verify access token expiration is approximately 20 minutes from now
  const accessExpires = new Date(refreshResponse.token.expired_at);
  const accessNow = new Date(now);
  const accessDifference = accessExpires.getTime() - accessNow.getTime();
  TestValidator.predicate("access token expires in ~20 minutes", () => {
    const minutes = accessDifference / (1000 * 60);
    return minutes > 15 && minutes < 25;
  });
  // Verify refresh token expiration is extended (rotated policy)
  const refreshExpires = new Date(refreshResponse.token.refreshable_until);
  const refreshNow = new Date(now);
  const refreshDifference = refreshExpires.getTime() - refreshNow.getTime();
  TestValidator.predicate("refresh token expiration extended", () => {
    const minutes = refreshDifference / (1000 * 60);
    return minutes > 1000; // At least ~16 hours (typical refresh token lifetime)
  });
  // 7. Validate original refresh token cannot be reused
  const staleRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("original refresh token invalidated", async () => {
    await authorize_user_refresh(staleRefreshConnection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ITodoAppUser.IRefresh,
    });
  });
  // 8. Validate response structure conforms to IAuthorized type
  TestValidator.equals(
    "response structure",
    refreshResponse.id,
    joinResponse.id,
  );
}
