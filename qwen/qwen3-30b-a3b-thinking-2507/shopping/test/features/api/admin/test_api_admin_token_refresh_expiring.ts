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

export async function test_api_admin_token_refresh_expiring(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Wait for 4 minutes to simulate the critical window before token expiration
  await new Promise((resolve) => setTimeout(resolve, 4 * 60 * 1000));
  // 3. Refresh token using the utility function
  const refreshedAdmin = await authorize_admin_refresh(adminConnection, {
    body: {
      refresh_token: admin.token.refresh,
    } satisfies IEcommerceAdmin.IRefresh,
  });
  typia.assert(refreshedAdmin);
  // 4. Validate that token was successfully refreshed
  TestValidator.predicate(
    "New access token",
    refreshedAdmin.token.access !== admin.token.access,
  );
  TestValidator.predicate(
    "Fresh refresh token",
    refreshedAdmin.token.refresh !== admin.token.refresh,
  );
}
