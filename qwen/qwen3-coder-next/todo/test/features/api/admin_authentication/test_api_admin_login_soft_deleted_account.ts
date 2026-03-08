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

export async function test_api_admin_login_soft_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Test1234!";
  const createdAdmin = await api.functional.todoApp.auth.admin.join(
    adminConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "127.0.0.1",
      } satisfies ITodoAppAdminSession.IJoin,
    },
  );
  typia.assert(createdAdmin);
  TestValidator.equals("admin account created", createdAdmin.email, adminEmail);
  // Step 2: Attempt to login with valid credentials (account exists)
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await api.functional.todoApp.auth.admin.login(
    loginConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "127.0.0.1",
      } satisfies ITodoAppAdminSession.ILogin,
    },
  );
  typia.assert(loginResponse);
  TestValidator.equals("login successful", loginResponse.email, adminEmail);
  TestValidator.predicate(
    "has access token",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    loginResponse.token.refresh.length > 0,
  );
  // Step 3: Test login with non-existent account (should fail)
  await TestValidator.error(
    "should reject login for non-existent account",
    async () => {
      await api.functional.todoApp.auth.admin.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "wrongpassword",
          ip: "192.168.1.1",
        } satisfies ITodoAppAdminSession.ILogin,
      });
    },
  );
  // Step 4: Test login with wrong password (should fail)
  await TestValidator.error(
    "should reject login with wrong password",
    async () => {
      await api.functional.todoApp.auth.admin.login(connection, {
        body: {
          email: adminEmail,
          password: "wrongpassword123",
          ip: "192.168.1.1",
        } satisfies ITodoAppAdminSession.ILogin,
      });
    },
  );
  // Note: The scenario requires testing soft-deleted account login, but there's no
  // API endpoint provided for soft deleting admin accounts. The current API only
  // provides join and login endpoints. A soft delete endpoint would need to be
  // implemented to fully test this scenario.
}
