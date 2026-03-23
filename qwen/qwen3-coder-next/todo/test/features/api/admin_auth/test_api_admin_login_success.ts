import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
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
  // Setup: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(joinResult);
  // Test: Login with valid credentials
  const loginResult = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(loginResult);
  // Validate response structure
  TestValidator.predicate("access_token exists", loginResult.access.length > 0);
  TestValidator.predicate(
    "refresh_token exists",
    loginResult.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at exists and valid",
    loginResult.expired_at.length > 0,
  );
  // Validate date formats
  const expiredDate = new Date(loginResult.expired_at);
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(expiredDate.getTime()),
  );
  // Validate session creation - try login again
  const secondLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(secondLogin);
  // Tokens should be different for different sessions
  TestValidator.notEquals(
    "different tokens for different sessions",
    loginResult.access,
    secondLogin.access,
  );
}