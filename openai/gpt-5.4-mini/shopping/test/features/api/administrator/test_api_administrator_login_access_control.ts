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

export async function test_api_administrator_login_access_control(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const joined = await authorize_administrator_join(adminConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(joined);
  TestValidator.equals("joined administrator email", joined.email, email);
  TestValidator.predicate(
    "joined administrator id exists",
    joined.id.length > 0,
  );
  TestValidator.predicate(
    "joined administrator access token exists",
    joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "joined administrator refresh token exists",
    joined.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "joined administrator expired_at exists",
    joined.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "joined administrator refreshable_until exists",
    joined.token.refreshable_until.length > 0,
  );
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_administrator_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  typia.assert(loggedIn);
  TestValidator.equals("logged in administrator id", loggedIn.id, joined.id);
  TestValidator.equals("logged in administrator email", loggedIn.email, email);
  TestValidator.equals(
    "logged in administrator grade",
    loggedIn.grade,
    joined.grade,
  );
  TestValidator.equals(
    "logged in administrator status",
    loggedIn.status,
    joined.status,
  );
  TestValidator.equals(
    "logged in administrator createdAt",
    loggedIn.createdAt,
    joined.createdAt,
  );
  TestValidator.equals(
    "logged in administrator deletedAt",
    loggedIn.deletedAt,
    joined.deletedAt,
  );
  TestValidator.predicate(
    "logged in access token exists",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "logged in refresh token exists",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "logged in expired_at exists",
    loggedIn.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "logged in refreshable_until exists",
    loggedIn.token.refreshable_until.length > 0,
  );
  await TestValidator.httpError(
    "administrator login rejects incorrect password",
    [401, 403],
    async () => {
      const wrongPasswordConnection: api.IConnection = {
        host: connection.host,
      };
      await authorize_administrator_login(wrongPasswordConnection, {
        body: {
          email,
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IMallPlatformAdministrator.ILogin,
      });
    },
  );
  await TestValidator.httpError(
    "administrator login rejects non-existent account",
    [401, 403],
    async () => {
      const missingAccountConnection: api.IConnection = {
        host: connection.host,
      };
      await authorize_administrator_login(missingAccountConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IMallPlatformAdministrator.ILogin,
      });
    },
  );
}
