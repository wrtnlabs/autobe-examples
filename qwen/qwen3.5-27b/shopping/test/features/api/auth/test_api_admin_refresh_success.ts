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
 * Test the primary success path for administrator token refresh.
 *
 * This test validates the complete token refresh workflow for administrators:
 * 1. Register a new admin account to obtain initial tokens
 * 2. Use the refresh token to obtain new access and refresh tokens
 * 3. Verify token properties and rotation behavior
 * 4. Validate admin identity information preservation
 */
export async function test_api_admin_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection and register admin
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {});
  typia.assert(initialAuth);
  // 2. Capture initial token values for comparison
  const initialRefreshToken = initialAuth.token.refresh;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  const initialAdminId = initialAuth.id;
  const initialEmail = initialAuth.email;
  // 3. Perform token refresh using the initial refresh token
  const refreshedAuth: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_refresh(adminConnection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IShoppingMallAdmin.IRefresh,
    });
  typia.assert(refreshedAuth);
  // 4. Validate refresh token rotation occurred
  TestValidator.notEquals(
    "refresh token rotated",
    initialRefreshToken,
    refreshedAuth.token.refresh,
  );
  // 5. Validate new access token is different
  TestValidator.notEquals(
    "access token rotated",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  // 6. Validate refreshable_until remains unchanged (7-day session expiration preserved)
  TestValidator.equals(
    "refreshable_until unchanged",
    refreshedAuth.token.refreshable_until,
    initialRefreshableUntil,
  );
  // 7. Validate new expired_at is different (new 1-hour validity)
  TestValidator.notEquals(
    "expired_at updated",
    refreshedAuth.token.expired_at,
    initialAuth.token.expired_at,
  );
  // 8. Validate admin identity information preserved
  TestValidator.equals("admin id preserved", refreshedAuth.id, initialAdminId);
  TestValidator.equals(
    "admin email preserved",
    refreshedAuth.email,
    initialEmail,
  );
  TestValidator.predicate(
    "admin grade is valid",
    refreshedAuth.grade === "regular" || refreshedAuth.grade === "super",
  );
  TestValidator.equals(
    "admin status is active",
    refreshedAuth.status,
    "active",
  );
  // 9. Validate timestamps are present
  TestValidator.predicate(
    "created_at is valid date-time",
    refreshedAuth.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    refreshedAuth.updated_at !== null,
  );
}
