import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate test credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "test1234" satisfies string & tags.Format<"password">;
  // Create administrator account via join
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_administrator_join(adminConnection, {
    body: { email, password } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(joinResult);
  // Attempt login with same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_administrator_login(loginConnection, {
    body: { email, password } satisfies IEcommerceAdministrator.ILogin,
  });
  typia.assert(loginResult);
  // Validate business logic - email matches input
  TestValidator.equals("email should match input", loginResult.email, email);
  // Validate token refresh capability with timestamps
  const now = Date.now();
  const expiredAt = new Date(loginResult.token.expired_at).getTime();
  const refreshableUntil = new Date(
    loginResult.token.refreshable_until,
  ).getTime();
  TestValidator.predicate("token should expire in future", expiredAt > now);
  TestValidator.predicate(
    "token should be refreshable after expiration",
    refreshableUntil > expiredAt,
  );
  // Verify authorization header is set for session continuity
  TestValidator.predicate(
    "authorization header should be set",
    loginConnection.headers?.Authorization === loginResult.token.access,
  );
}
