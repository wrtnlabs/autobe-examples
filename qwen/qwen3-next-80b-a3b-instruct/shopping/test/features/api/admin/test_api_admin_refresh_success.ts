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

export async function test_api_admin_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account first
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(joinResult);
  // Refresh the token
  const refreshConnection: api.IConnection = { host: connection.host };
  refreshConnection.headers = {
    Authorization: `Bearer ${joinResult.token.access}`,
  };
  const refreshResult = await authorize_admin_refresh(refreshConnection, {
    body: {} satisfies IShoppingMallAdmin.IRefresh,
  });
  typia.assert(refreshResult);
  // Validate that access token is renewed
  TestValidator.notEquals(
    "access token is different",
    joinResult.token.access,
    refreshResult.token.access,
  );
  // Validate that refresh token is preserved
  TestValidator.equals(
    "refresh token is preserved",
    joinResult.token.refresh,
    refreshResult.token.refresh,
  );
  // Validate that expired_at is in the future
  const now = new Date();
  const expiredAt = new Date(refreshResult.token.expired_at);
  TestValidator.predicate(
    "new access token expires after 30 minutes",
    expiredAt.getTime() - now.getTime() >= 30 * 60 * 1000,
  );
  // Validate that refreshable_until is preserved
  TestValidator.equals(
    "refreshable_until is preserved",
    joinResult.token.refreshable_until,
    refreshResult.token.refreshable_until,
  );
}
