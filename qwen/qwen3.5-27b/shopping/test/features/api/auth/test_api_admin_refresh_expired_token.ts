import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin refresh token expiration scenario.
 * Validates that refresh tokens include proper expiration metadata (refreshable_until)
 * and verifies the 7-day session lifecycle policy is enforced via token structure.
 *
 * Note: Actual token expiration testing requires time simulation beyond 7 days,
 * which is not feasible in standard E2E tests. This test validates the expiration
 * mechanism exists and is properly configured.
 */
export async function test_api_admin_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin to obtain initial tokens with expiration metadata
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Extract token information
  const refreshToken = admin.token.refresh;
  const accessToken = admin.token.access;
  const expiredAt = admin.token.expired_at;
  const refreshableUntil = admin.token.refreshable_until;
  // 3. Verify token structure includes expiration metadata
  TestValidator.predicate("refresh token exists", refreshToken.length > 0);
  TestValidator.predicate("access token exists", accessToken.length > 0);
  TestValidator.predicate("expired_at timestamp exists", expiredAt.length > 0);
  TestValidator.predicate(
    "refreshable_until timestamp exists",
    refreshableUntil.length > 0,
  );
  // 4. Verify expiration timestamps are valid dates
  const expiredAtDate = new Date(expiredAt);
  const refreshableUntilDate = new Date(refreshableUntil);
  const now = new Date();
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(expiredAtDate.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(refreshableUntilDate.getTime()),
  );
  // 5. Verify access token expires before refresh token (7-day lifecycle)
  TestValidator.predicate(
    "access token expires before refreshable_until",
    expiredAtDate < refreshableUntilDate,
  );
  // 6. Verify both timestamps are in the future
  TestValidator.predicate("access token not yet expired", expiredAtDate > now);
  TestValidator.predicate(
    "refresh token not yet expired",
    refreshableUntilDate > now,
  );
  // 7. Verify refreshable_until is approximately 7 days from now
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  const timeUntilRefreshExpiry = refreshableUntilDate.getTime() - now.getTime();
  TestValidator.predicate(
    "refresh token valid for approximately 7 days",
    timeUntilRefreshExpiry > 6 * 24 * 60 * 60 * 1000 && // At least 6 days
      timeUntilRefreshExpiry < 8 * 24 * 60 * 60 * 1000,
  );
  // 8. Test that using an invalid/expired token format returns authentication error
  const invalidConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "invalid refresh token returns 401 error",
    401,
    async () => {
      await authorize_admin_refresh(invalidConnection, {
        body: {
          refresh_token: "invalid_expired_token_12345",
        } satisfies IShoppingMallAdmin.IRefresh,
      });
    },
  );
  // 9. Verify that the valid refresh token works (before it expires)
  const validRefreshConnection: api.IConnection = { host: connection.host };
  const refreshedAdmin = await authorize_admin_refresh(validRefreshConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IShoppingMallAdmin.IRefresh,
  });
  typia.assert(refreshedAdmin);
  // 10. Verify refreshed tokens are different from original
  TestValidator.notEquals(
    "new access token is different",
    refreshedAdmin.token.access,
    accessToken,
  );
  TestValidator.notEquals(
    "new refresh token is different",
    refreshedAdmin.token.refresh,
    refreshToken,
  );
  // 11. Verify admin identity remains the same after refresh
  TestValidator.equals(
    "admin id unchanged after refresh",
    refreshedAdmin.id,
    admin.id,
  );
  TestValidator.equals(
    "admin email unchanged after refresh",
    refreshedAdmin.email,
    admin.email,
  );
}
