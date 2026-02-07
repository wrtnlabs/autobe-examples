import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_token_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminUser);
  // 2. Create connection for refreshing tokens
  const refreshTokenConnection: api.IConnection = { host: connection.host };
  // 3. Refresh authentication tokens
  const refreshedUser = await authorize_admin_refresh(refreshTokenConnection, {
    body: {} satisfies IEcommerceAdmin.IRefresh,
  });
  typia.assert(refreshedUser);
  // 4. Validate token expiration times
  TestValidator.predicate(
    "Access token should expire within 30 minutes from now",
    new Date(refreshedUser.token.expired_at) >
      new Date(Date.now() + 28 * 60 * 1000) &&
      new Date(refreshedUser.token.expired_at) <
        new Date(Date.now() + 32 * 60 * 1000),
  );
  TestValidator.predicate(
    "Refresh token should expire within 6 hours from now",
    new Date(refreshedUser.token.refreshable_until) >
      new Date(Date.now() + 5.5 * 60 * 60 * 1000) &&
      new Date(refreshedUser.token.refreshable_until) <
        new Date(Date.now() + 6.5 * 60 * 60 * 1000),
  );
}
