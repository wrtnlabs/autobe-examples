import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_refresh_token_account_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account and obtain initial tokens
  const superAdmin = await authorize_super_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Validate initial account state
  TestValidator.predicate("account is active", superAdmin.deleted_at === null);
  TestValidator.predicate(
    "has valid access token",
    superAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    superAdmin.token.refresh.length > 0,
  );
  // 2. Create new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Attempt to refresh token using the refresh token from initial join
  const refreshed = await authorize_super_admin_refresh(refreshConnection, {
    body: {
      refreshToken: superAdmin.token.refresh,
    } satisfies IShoppingMallSuperAdmin.IRefresh,
  });
  typia.assert(refreshed);
  // 4. Validate refresh response
  TestValidator.equals("same account id", refreshed.id, superAdmin.id);
  TestValidator.equals("same email", refreshed.email, superAdmin.email);
  TestValidator.predicate(
    "account still active",
    refreshed.deleted_at === null,
  );
  TestValidator.predicate(
    "new access token",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token",
    refreshed.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access token rotated",
    refreshed.token.access,
    superAdmin.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshed.token.refresh,
    superAdmin.token.refresh,
  );
  // 5. Validate token expiration timestamps are valid ISO dates
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(Date.parse(refreshed.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(Date.parse(refreshed.token.refreshable_until)),
  );
}
