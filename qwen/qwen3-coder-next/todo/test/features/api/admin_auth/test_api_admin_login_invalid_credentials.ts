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

export async function test_api_admin_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // First, create a valid admin account for testing
  const adminConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: RandomGenerator.alphabets(15),
  } satisfies ITodoAppAdminSession.IJoin;
  const adminAuthorized = await api.functional.todoApp.auth.admin.join(
    adminConnection,
    {
      body: joinInput,
    },
  );
  typia.assert(adminAuthorized);
  // Test 1: Valid email but wrong password
  await TestValidator.error(
    "login should fail with wrong password",
    async () => {
      await api.functional.todoApp.auth.admin.login(connection, {
        body: {
          email: joinInput.email,
          password: "wrong_password_" + RandomGenerator.alphaNumeric(8),
          ip: RandomGenerator.alphabets(15),
        } satisfies ITodoAppAdminSession.ILogin,
      });
    },
  );
  // Test 2: Non-existent email with valid password format
  await TestValidator.error(
    "login should fail with non-existent email",
    async () => {
      await api.functional.todoApp.auth.admin.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: joinInput.password,
          ip: RandomGenerator.alphabets(15),
        } satisfies ITodoAppAdminSession.ILogin,
      });
    },
  );
  // Test 3: Invalid email format
  await TestValidator.error(
    "login should fail with invalid email format",
    async () => {
      await api.functional.todoApp.auth.admin.login(connection, {
        body: {
          email: "invalid-email",
          password: joinInput.password,
          ip: RandomGenerator.alphabets(15),
        } satisfies ITodoAppAdminSession.ILogin,
      });
    },
  );
  // Test 4: Valid email but password with special characters that don't match
  await TestValidator.error(
    "login should fail with password containing special characters",
    async () => {
      await api.functional.todoApp.auth.admin.login(connection, {
        body: {
          email: joinInput.email,
          password: joinInput.password + "!@#$%^&*",
          ip: RandomGenerator.alphabets(15),
        } satisfies ITodoAppAdminSession.ILogin,
      });
    },
  );
}
