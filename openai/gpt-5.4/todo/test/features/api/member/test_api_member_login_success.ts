import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  const joined = await authorize_member_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email,
    password,
  } satisfies ITodoAppMember.ILogin;
  const loggedIn = await authorize_member_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "joined member email matches input",
    joined.email,
    email,
  );
  TestValidator.equals(
    "logged in member email matches input",
    loggedIn.email,
    email,
  );
  TestValidator.equals(
    "login email matches joined member email",
    loggedIn.email,
    joined.email,
  );
  TestValidator.equals(
    "login returns same member id as joined account",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "logged in account remains active",
    loggedIn.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token is non-empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access expiration timestamp is non-empty",
    loggedIn.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable-until timestamp is non-empty",
    loggedIn.token.refreshable_until.length > 0,
  );
  TestValidator.notEquals(
    "access and refresh tokens are different",
    loggedIn.token.access,
    loggedIn.token.refresh,
  );
}
