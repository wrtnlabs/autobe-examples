import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an administrator can successfully refresh their authentication tokens.
 *
 * This test validates:
 * 1. Administrator can obtain refresh token through join
 * 2. Refresh endpoint returns valid IAuthorized response
 * 3. New tokens are generated (token rotation)
 * 4. Access token expires approximately 1 hour in the future
 * 5. Refresh token deadline is within 24-hour maximum session
 */
export async function test_api_administrator_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and get initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(initialAuth);
  const originalRefreshToken = initialAuth.token.refresh;
  const originalAccessToken = initialAuth.token.access;
  // 2. Verify initial administrator profile
  TestValidator.equals(
    "initial grade is regular",
    initialAuth.grade,
    "regular",
  );
  TestValidator.predicate(
    "initial id is valid UUID",
    initialAuth.id.length === 36,
  );
  TestValidator.predicate(
    "initial email is valid",
    initialAuth.email.includes("@"),
  );
  // 3. Call refresh endpoint with the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_administrator_refresh(
    refreshConnection,
    {
      body: {
        refresh: originalRefreshToken,
      } satisfies IShoppingMallAdministrator.IRefresh,
    },
  );
  typia.assert(refreshedAuth);
  // 4. Verify administrator profile matches
  TestValidator.equals(
    "administrator id matches",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "administrator email matches",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "administrator grade matches",
    refreshedAuth.grade,
    initialAuth.grade,
  );
  // 5. Verify token rotation - new tokens should be different
  TestValidator.notEquals(
    "access token rotated",
    refreshedAuth.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuth.token.refresh,
    originalRefreshToken,
  );
  // 6. Verify access token expiration (approximately 1 hour with 5 minute buffer)
  const now = new Date();
  const expiredAt = new Date(refreshedAuth.token.expired_at);
  const accessExpirationMs = expiredAt.getTime() - now.getTime();
  const oneHourMs = 60 * 60 * 1000;
  const fiveMinuteBufferMs = 5 * 60 * 1000;
  TestValidator.predicate(
    "access token expires in approximately 1 hour",
    accessExpirationMs > 0 &&
      accessExpirationMs <= oneHourMs + fiveMinuteBufferMs,
  );
  // 7. Verify refresh token deadline (within 24 hours with buffer)
  const refreshableUntil = new Date(refreshedAuth.token.refreshable_until);
  const refreshDeadlineMs = refreshableUntil.getTime() - now.getTime();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  TestValidator.predicate(
    "refresh token deadline within 24 hours",
    refreshDeadlineMs > 0 && refreshDeadlineMs <= twentyFourHoursMs,
  );
  // 8. Verify session extension - refreshable_until should be at or after initial value
  const originalRefreshableUntil = new Date(
    initialAuth.token.refreshable_until,
  );
  TestValidator.predicate(
    "session rolling expiration extended or maintained",
    refreshableUntil.getTime() >= originalRefreshableUntil.getTime(),
  );
}
