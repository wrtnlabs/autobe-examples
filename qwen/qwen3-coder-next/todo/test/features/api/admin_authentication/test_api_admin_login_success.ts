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
  // Step 1: Create admin account first
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoAppAdminSession.IJoin;
  const adminAuthorization = await api.functional.todoApp.auth.admin.join(
    connection,
    {
      body: joinInput,
    },
  );
  typia.assert(adminAuthorization);
  // Step 2: Login with the created admin credentials
  const loginInput = {
    email: adminAuthorization.email,
    password: joinInput.password,
    ip: "127.0.0.1",
  } satisfies ITodoAppAdminSession.ILogin;
  const loginResult = await api.functional.todoApp.auth.admin.login(
    connection,
    {
      body: loginInput,
    },
  );
  typia.assert(loginResult);
  // Step 3: Validate response structure
  TestValidator.equals(
    "admin email matches",
    loginResult.email,
    adminAuthorization.email,
  );
  TestValidator.equals(
    "admin id matches",
    loginResult.id,
    adminAuthorization.id,
  );
  TestValidator.equals(
    "token access exists",
    typeof loginResult.token.access,
    "string",
  );
  TestValidator.equals(
    "token refresh exists",
    typeof loginResult.token.refresh,
    "string",
  );
  // Step 4: Validate timestamp formats
  TestValidator.equals(
    "expired_at is date-time format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      loginResult.token.expired_at,
    ),
    true,
  );
  TestValidator.equals(
    "refreshable_until is date-time format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      loginResult.token.refreshable_until,
    ),
    true,
  );
}
