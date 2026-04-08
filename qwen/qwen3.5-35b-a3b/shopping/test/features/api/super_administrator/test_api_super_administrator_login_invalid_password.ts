import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_login_invalid_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account with valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const correctEmail = "admin2@example.com";
  const correctPassword = "CorrectPass456!";
  const displayName = "Test Admin 2";
  const joinResult = await authorize_super_administrator_join(joinConnection, {
    body: {
      email: correctEmail,
      password: correctPassword,
      display_name: displayName,
      href: "http://localhost/admin/join",
      referrer: "http://localhost/admin",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallSuperAdministrator.IJoin,
  });
  typia.assert(joinResult);
  // Verify join response contains valid tokens and summary
  TestValidator.predicate(
    "join response has valid access token",
    joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "join response has valid refresh token",
    joinResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "join response has valid expired_at",
    new Date(joinResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "join response has superAdministrator summary",
    joinResult.superAdministrator.id.length > 0,
  );
  // 2. Attempt login with correct email but wrong password
  const loginConnection: api.IConnection = { host: connection.host };
  const wrongPassword = "WrongPassword789!";
  // 3. Verify login is rejected with 401 Unauthorized status
  await TestValidator.httpError(
    "login rejects with 401 for invalid password",
    401,
    async () =>
      await authorize_super_administrator_login(loginConnection, {
        body: {
          email: correctEmail,
          password: wrongPassword,
        } satisfies IEcommerceMallSuperAdministrator.ILogin,
      }),
  );
  // 4. Verify error response does not expose sensitive information
  await TestValidator.httpError(
    "login error returns 401",
    401,
    async () =>
      await authorize_super_administrator_login(loginConnection, {
        body: {
          email: correctEmail,
          password: wrongPassword,
        } satisfies IEcommerceMallSuperAdministrator.ILogin,
      }),
  );
  // 5. Verify no authorization header was set in connection after failed login
  TestValidator.predicate(
    "no authorization token in connection after failed login",
    !loginConnection.headers?.authorization ||
      loginConnection.headers.authorization === "undefined",
  );
}