import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin account and obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse =
    await api.functional.discussionBoard.auth.super_admin.join(joinConnection, {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    });
  typia.assert(joinResponse);
  // Verify initial authentication was successful
  TestValidator.predicate("initial authentication successful", () => {
    return joinConnection.headers?.Authorization !== undefined;
  });
  // Step 2: Extract refresh token from initial authentication
  const refreshToken = joinResponse.token.refresh;
  TestValidator.notEquals(
    "refresh token exists and is not empty",
    refreshToken,
    "",
  );
  // Step 3: Perform refresh operation using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse =
    await api.functional.discussionBoard.auth.super_admin.refresh(
      refreshConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.IRefresh>(),
      },
    );
  typia.assert(refreshResponse);
  // Step 4: Validate refreshed tokens
  TestValidator.predicate(
    "new access token exists",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token exists",
    refreshResponse.token.refresh.length > 0,
  );
  // Step 5: Validate token expiration timestamps
  TestValidator.predicate("access token has valid expiration", () => {
    const expirationDate = new Date(refreshResponse.token.expired_at);
    return !isNaN(expirationDate.getTime()) && expirationDate > new Date();
  });
  TestValidator.predicate("refresh token has valid expiration", () => {
    const refreshableUntil = new Date(refreshResponse.token.refreshable_until);
    return !isNaN(refreshableUntil.getTime()) && refreshableUntil > new Date();
  });
  // Step 6: Validate token rotation occurred
  TestValidator.notEquals(
    "tokens were rotated",
    refreshResponse.token.access,
    joinResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens were rotated",
    refreshResponse.token.refresh,
    joinResponse.token.refresh,
  );
  // Step 7: Verify new tokens work for authenticated requests by using the connection
  // The refresh function automatically updates refreshConnection.headers
  TestValidator.predicate(
    "refresh connection has updated authorization",
    () => {
      return (
        refreshConnection.headers?.Authorization ===
        refreshResponse.token.access
      );
    },
  );
}
