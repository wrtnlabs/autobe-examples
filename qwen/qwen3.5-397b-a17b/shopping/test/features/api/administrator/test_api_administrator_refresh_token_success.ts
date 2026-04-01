import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator token refresh functionality.
 * 1. Register new administrator account to obtain initial tokens
 * 2. Call refresh endpoint with the refresh token
 * 3. Verify new tokens are generated and different from original (token rotation)
 * 4. Verify administrator identity is preserved in response
 */
export async function test_api_administrator_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(joinResult);
  // Capture original tokens
  const originalAccessToken = joinResult.token.access;
  const originalRefreshToken = joinResult.token.refresh;
  const administratorId = joinResult.id;
  const administratorEmail = joinResult.email;
  // 2. Call refresh endpoint with the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_administrator_refresh(
    refreshConnection,
    {
      body: {
        refreshToken: originalRefreshToken,
      } satisfies IShoppingMallAdministrator.IRefresh,
    },
  );
  typia.assert(refreshResult);
  // 3. Verify token rotation - new tokens should be different from original
  TestValidator.notEquals(
    "access token rotated",
    originalAccessToken,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    refreshResult.token.refresh,
  );
  // 4. Verify administrator identity is preserved
  TestValidator.equals(
    "administrator id preserved",
    administratorId,
    refreshResult.id,
  );
  TestValidator.equals(
    "administrator email preserved",
    administratorEmail,
    refreshResult.email,
  );
  // 5. Verify response contains valid token structure
  TestValidator.predicate(
    "has access token",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    refreshResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expiration timestamp",
    refreshResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refreshable until timestamp",
    refreshResult.token.refreshable_until.length > 0,
  );
  // 6. Verify timestamps are valid ISO 8601 format
  const expiredAtDate = new Date(refreshResult.token.expired_at);
  const refreshableUntilDate = new Date(refreshResult.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(expiredAtDate.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(refreshableUntilDate.getTime()),
  );
  // 7. Verify refreshable_until is after or equal to expired_at
  TestValidator.predicate(
    "refreshable_until >= expired_at",
    refreshableUntilDate >= expiredAtDate,
  );
}
