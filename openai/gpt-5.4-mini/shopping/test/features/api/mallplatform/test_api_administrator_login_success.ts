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

export async function test_api_administrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const email: string & tags.Format<"email"> =
    `${RandomGenerator.alphabets(10)}@example.com`;
  const password: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(12);
  const joined = await authorize_administrator_join(adminConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_administrator_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "administrator id should match the created account",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "administrator email should match input",
    loggedIn.email,
    email,
  );
  TestValidator.predicate(
    "administrator grade should be returned",
    loggedIn.grade.length > 0,
  );
  TestValidator.predicate(
    "administrator status should be returned",
    loggedIn.status.length > 0,
  );
  TestValidator.predicate(
    "access token should be issued",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be issued",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration should be a future timestamp",
    new Date(loggedIn.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refresh token expiration should be a future timestamp",
    new Date(loggedIn.token.refreshable_until).getTime() > Date.now(),
  );
}
