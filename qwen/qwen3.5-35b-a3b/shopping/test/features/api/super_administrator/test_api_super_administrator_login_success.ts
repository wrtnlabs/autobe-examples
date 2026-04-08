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

export async function test_api_super_administrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const joinPassword: string & tags.MinLength<8> & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(12);
  const joinDisplayName: string = RandomGenerator.name(2);
  const joinResult = await authorize_super_administrator_join(joinConnection, {
    body: {
      email: joinEmail,
      display_name: joinDisplayName,
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    } satisfies IEcommerceMallSuperAdministrator.IJoin,
  });
  typia.assert(joinResult);
  const joinId: string & tags.Format<"uuid"> = joinResult.id;
  // 2. Login immediately after join with same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_super_administrator_login(
    loginConnection,
    {
      body: {
        email: joinEmail,
        password: joinPassword,
      } satisfies IEcommerceMallSuperAdministrator.ILogin,
    },
  );
  typia.assert(loginResult);
  // 3. Verify login response contains correct data
  TestValidator.equals("login id matches join id", loginResult.id, joinId);
  TestValidator.equals(
    "login email matches join email",
    loginResult.superAdministrator.email,
    joinEmail,
  );
  TestValidator.equals(
    "login display_name matches",
    loginResult.superAdministrator.display_name,
    joinDisplayName,
  );
  // 4. Verify tokens are valid
  const access: string = loginResult.token.access;
  const refresh: string = loginResult.token.refresh;
  const expiredAt: string & tags.Format<"date-time"> =
    loginResult.token.expired_at;
  const refreshableUntil: string & tags.Format<"date-time"> =
    loginResult.token.refreshable_until;
  typia.assert(access);
  typia.assert(refresh);
  typia.assert(expiredAt);
  typia.assert(refreshableUntil);
  // 5. Verify token expiration timestamps are valid
  const expiredDate: Date = new Date(expiredAt);
  const refreshableDate: Date = new Date(refreshableUntil);
  TestValidator.predicate(
    "expired_at is in the future",
    expiredDate.getTime() > new Date().getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableDate.getTime() > new Date().getTime(),
  );
  // 6. Verify multiple concurrent sessions are allowed
  const secondLoginConnection: api.IConnection = { host: connection.host };
  const secondLoginResult = await authorize_super_administrator_login(
    secondLoginConnection,
    {
      body: {
        email: joinEmail,
        password: joinPassword,
      } satisfies IEcommerceMallSuperAdministrator.ILogin,
    },
  );
  typia.assert(secondLoginResult);
  // Verify each login returns a distinct access token
  TestValidator.notEquals(
    "login tokens are distinct",
    loginResult.token.access,
    secondLoginResult.token.access,
  );
  // Verify both logins reference the same super administrator
  TestValidator.equals(
    "second login id matches first login id",
    secondLoginResult.id,
    joinId,
  );
  TestValidator.equals(
    "second login email matches first login email",
    secondLoginResult.superAdministrator.email,
    joinEmail,
  );
}