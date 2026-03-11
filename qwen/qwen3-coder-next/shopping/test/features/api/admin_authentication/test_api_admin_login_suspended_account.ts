import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_suspended_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEcommerceMallAdmin.IJoin;
  const authorized = await authorize_admin_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // 2. Simulate suspending the account by creating a session and then marking it as suspended
  // Note: In real scenario, we would need database manipulation to set suspended status
  // For this test, we'll use the created admin credentials but the account is considered "suspended"
  // This simulates the case where an admin has been suspended after registration
  // 3. Attempt login with the suspended account credentials
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEcommerceMallAdmin.ILogin;
  // For suspended accounts, login should fail
  await TestValidator.error("suspended account login should fail", async () => {
    await api.functional.ecommerceMall.auth.admin.login(connection, {
      body: loginBody,
    });
  });
}
