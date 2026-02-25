import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
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
  // 1. Create super administrator account via join
  const joinConnection: api.IConnection = { host: connection.host };
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceSuperAdministrator.IJoin;
  const registered = await authorize_super_administrator_join(joinConnection, {
    body: joinCredentials,
  });
  typia.assert(registered);
  // 2. Attempt login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginCredentials = {
    email: joinCredentials.email,
    password: joinCredentials.password,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceSuperAdministrator.ILogin;
  const loggedIn = await authorize_super_administrator_login(loginConnection, {
    body: loginCredentials,
  });
  typia.assert(loggedIn);
  // 3. Validate authentication response
  TestValidator.equals(
    "super administrator ID matches",
    loggedIn.id,
    registered.id,
  );
  TestValidator.equals(
    "email matches credentials",
    loggedIn.email,
    joinCredentials.email,
  );
  TestValidator.predicate(
    "token access is valid JWT",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is valid",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration is valid date",
    new Date(loggedIn.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable until is valid date",
    new Date(loggedIn.token.refreshable_until).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "created at timestamp is valid",
    new Date(loggedIn.created_at).getTime() <= Date.now(),
  );
  TestValidator.predicate(
    "updated at timestamp is valid",
    new Date(loggedIn.updated_at).getTime() <= Date.now(),
  );
  TestValidator.equals(
    "deleted at should be null for active account",
    loggedIn.deleted_at,
    null,
  );
}
