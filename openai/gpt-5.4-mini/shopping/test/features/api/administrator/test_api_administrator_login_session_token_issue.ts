import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_login_session_token_issue(
  connection: api.IConnection,
): Promise<void> {
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const administratorConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email,
        password,
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const loginConnection1: api.IConnection = { host: connection.host };
  const login1 = await authorize_administrator_login(loginConnection1, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  typia.assert(login1);
  const loginConnection2: api.IConnection = { host: connection.host };
  const login2 = await authorize_administrator_login(loginConnection2, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  typia.assert(login2);
  TestValidator.equals(
    "administrator id should remain consistent",
    login1.id,
    administrator.id,
  );
  TestValidator.equals(
    "administrator id should remain consistent",
    login2.id,
    administrator.id,
  );
  TestValidator.equals(
    "administrator email should remain consistent",
    login1.email,
    administrator.email,
  );
  TestValidator.equals(
    "administrator email should remain consistent",
    login2.email,
    administrator.email,
  );
  TestValidator.equals(
    "administrator grade should remain consistent",
    login1.grade,
    administrator.grade,
  );
  TestValidator.equals(
    "administrator grade should remain consistent",
    login2.grade,
    administrator.grade,
  );
  TestValidator.equals(
    "administrator status should remain consistent",
    login1.status,
    administrator.status,
  );
  TestValidator.equals(
    "administrator status should remain consistent",
    login2.status,
    administrator.status,
  );
  TestValidator.notEquals(
    "access token should be freshly issued",
    login1.token.access,
    login2.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be freshly issued",
    login1.token.refresh,
    login2.token.refresh,
  );
  TestValidator.notEquals(
    "access expiry should not be reused",
    login1.token.expired_at,
    login2.token.expired_at,
  );
  TestValidator.notEquals(
    "refresh expiry should not be reused",
    login1.token.refreshable_until,
    login2.token.refreshable_until,
  );
}
