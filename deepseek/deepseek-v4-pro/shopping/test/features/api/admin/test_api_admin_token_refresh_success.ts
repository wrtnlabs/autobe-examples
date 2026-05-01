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
 * Test successful admin token refresh workflow.
 *
 * Validates that an administrator can refresh their JWT session using a valid refresh token obtained from the join endpoint. The refresh endpoint must return a new token pair with updated expiration timestamps while preserving the administrator's identity fields.
 *
 * 1. Administrator registers via the join endpoint and receives initial IAuthorized response with JWT tokens.
 * 2. Administrator calls the refresh endpoint with the initial refresh token.
 * 3. Validates that the new access and refresh tokens differ from the originals.
 * 4. Validates that identity fields (id, email, grade, created_at) remain unchanged.
 * 5. Validates that expiration timestamps (expired_at, refreshable_until) are updated.
 */
export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin via join
  const adminConnection: api.IConnection = { host: connection.host };
  const initial = await authorize_admin_join(adminConnection, {});
  typia.assert(initial);
  // 2. Refresh tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh: initial.token.refresh,
    } satisfies IShoppingMallAdmin.IRefresh,
  });
  typia.assert(refreshed);
  // 3. Validate token rotation
  TestValidator.notEquals(
    "access token rotated",
    initial.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    initial.token.refresh,
    refreshed.token.refresh,
  );
  // 4. Validate identity preservation
  TestValidator.equals("id preserved", initial.id, refreshed.id);
  TestValidator.equals("email preserved", initial.email, refreshed.email);
  TestValidator.equals("grade preserved", initial.grade, refreshed.grade);
  TestValidator.equals(
    "created_at preserved",
    initial.created_at,
    refreshed.created_at,
  );
  // 5. Validate session extension
  TestValidator.notEquals(
    "expired_at extended",
    initial.token.expired_at,
    refreshed.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable_until extended",
    initial.token.refreshable_until,
    refreshed.token.refreshable_until,
  );
}
