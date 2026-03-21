import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_token_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new super admin account to obtain valid tokens
  const superAdminConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(registered);
  const originalAccessToken = registered.token.access;
  const originalRefreshToken = registered.token.refresh;
  const registeredEmail = registered.email;
  // 2. Call refresh endpoint with the valid refresh token
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_super_admin_refresh(refreshedConnection, {
    body: {
      refresh: originalRefreshToken,
    } satisfies IEcommerceMallSuperAdmin.IRefresh,
  });
  typia.assert(refreshed);
  // 3. Validate response body structure
  TestValidator.equals(
    "super admin id is valid uuid format",
    refreshed.id,
    registered.id,
  );
  TestValidator.equals(
    "email matches registered account",
    refreshed.email,
    registeredEmail,
  );
  TestValidator.equals("deleted_at is null", refreshed.deleted_at, null);
  // 4. Validate token object structure
  TestValidator.predicate(
    "access token exists",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    refreshed.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(refreshed.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshed.token.refreshable_until,
    ),
  );
  // 5. Verify new tokens are different from original
  TestValidator.notEquals(
    "new access token is different",
    refreshed.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token is different",
    refreshed.token.refresh,
    originalRefreshToken,
  );
  // 6. Verify timestamps
  const now = new Date();
  const expiredAt = new Date(refreshed.token.expired_at);
  const refreshableUntil = new Date(refreshed.token.refreshable_until);
  TestValidator.predicate("expired_at is a future timestamp", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is later than expired_at",
    refreshableUntil > expiredAt,
  );
}