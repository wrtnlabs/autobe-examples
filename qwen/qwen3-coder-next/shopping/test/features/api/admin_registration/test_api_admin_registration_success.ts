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

export async function test_api_admin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Register new admin account with empty body (as per IShoppingMallAdmin.IJoin = {})
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  // Validate token structure
  const { access, refresh, expired_at, refreshable_until } =
    adminAuthorized.token;
  // Validate access token exists and is non-empty
  TestValidator.predicate("access token exists", access.length > 0);
  // Validate refresh token exists and is non-empty
  TestValidator.predicate("refresh token exists", refresh.length > 0);
  // Validate expiration timestamps are valid ISO 8601 format
  TestValidator.predicate("expired_at is valid date", () => {
    try {
      new Date(expired_at);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate("refreshable_until is valid date", () => {
    try {
      new Date(refreshable_until);
      return true;
    } catch {
      return false;
    }
  });
  // Verify access token is shorter than refresh token (typical JWT pattern)
  TestValidator.predicate(
    "access token shorter than refresh",
    access.length < refresh.length,
  );
  // Verify expiration times are in future
  const now = new Date();
  const expiredAtDate = new Date(expired_at);
  const refreshableUntilDate = new Date(refreshable_until);
  TestValidator.predicate("expired_at is in future", expiredAtDate > now);
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntilDate > now,
  );
  // Verify refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until after expired_at",
    refreshableUntilDate > expiredAtDate,
  );
}
