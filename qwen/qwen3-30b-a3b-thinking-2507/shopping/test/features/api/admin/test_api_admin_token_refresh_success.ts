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

export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration to get initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(authResult);
  // 2. Extract refresh token from initial response
  const refreshToken = authResult.token.refresh;
  // 3. Refresh token using utility function, which will create a new admin connection
  const refreshedResult = await authorize_admin_refresh(adminConnection, {
    body: { refresh_token: refreshToken } satisfies IEcommerceAdmin.IRefresh,
  });
  typia.assert(refreshedResult);
  // 4. Validate new access token is present and expiration is in the future
  TestValidator.equals(
    "New access token exists",
    typeof refreshedResult.token.access,
    "string",
  );
  TestValidator.predicate(
    "New access token expiration is in future",
    new Date(refreshedResult.token.expired_at) > new Date(),
  );
  // 5. Validate refresh token has been updated to a new value
  TestValidator.notEquals(
    "New refresh token is different from original",
    refreshedResult.token.refresh,
    refreshToken,
  );
}
