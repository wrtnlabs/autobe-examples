import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_invalid_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account with correct password
  const adminConnection: api.IConnection = { host: connection.host };
  const correctPassword = "CorrectPass123!";
  const testEmail = "admin_fail@test.com";
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: testEmail,
      password: correctPassword,
      displayName: "Test Admin",
      href: "http://localhost:3000/dashboard",
      referrer: "http://localhost:3000/login",
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Attempt login with wrong password
  const loginConnection: api.IConnection = { host: connection.host };
  const wrongPassword = "WrongPassword456!";
  // Verify HTTP 401 Unauthorized is returned
  await TestValidator.httpError(
    "invalid password returns 401",
    401,
    async () => {
      await api.functional.erpHrm.auth.admin.login(loginConnection, {
        body: {
          email: testEmail,
          password: wrongPassword,
          href: "http://localhost:3000/dashboard",
          referrer: "http://localhost:3000/login",
        } satisfies IErpHrmAdmin.ILogin,
      });
    },
  );
  // 3. Verify NO session was created (no tokens returned)
  TestValidator.equals(
    "no authorization token after failed login",
    loginConnection.headers?.Authorization,
    undefined,
  );
}
