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

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Create new admin account using utility
  const password = RandomGenerator.alphaNumeric(12);
  const joinResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(joinResponse);
  // 3. Login with the newly created admin account
  const loginResponse = await authorize_admin_login(adminConnection, {
    body: {
      email: joinResponse.email,
      password: password,
    } satisfies IEcommerceAdmin.ILogin,
  });
  typia.assert(loginResponse);
  // 4. Validate token expiration (30 minutes) and authorization structure
  const thirtyMinutes = 30 * 60 * 1000;
  const tokenExpiration = new Date(loginResponse.token.expired_at).getTime();
  const currentTime = new Date().getTime();
  const timeDifference = tokenExpiration - currentTime;
  TestValidator.predicate(
    "Token expiration is approximately 30 minutes",
    timeDifference >= 28 * 60 * 1000 && timeDifference <= 32 * 60 * 1000,
  );
}
