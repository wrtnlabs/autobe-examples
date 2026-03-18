import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_login_success(
  connection: api.IConnection,
): Promise<void> {
  const ownerJoinConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const email = `${RandomGenerator.alphabets(10)}.${RandomGenerator.alphabets(6)}@example.com`;
  const joinBody = {
    email,
    password,
    href: "https://example.com/hrm/owner/join",
    referrer: "https://example.com/hrm/sign-in",
    ip: "127.0.0.1",
  } satisfies IHrmTimeTrackingOwner.IJoin;
  const joined = await authorize_owner_join(ownerJoinConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  TestValidator.equals(
    "join connection authorization header matches returned access token",
    ownerJoinConnection.headers?.Authorization,
    joined.token.access,
  );
  const ownerLoginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IHrmTimeTrackingOwner.ILogin;
  const loggedIn = await authorize_owner_login(ownerLoginConnection, {
    body: loginBody,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "login uses the registered email",
    loggedIn.email,
    joinBody.email,
  );
  TestValidator.equals(
    "login authenticates the same owner account",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "join and login preserve owner email identity",
    loggedIn.email,
    joined.email,
  );
  TestValidator.notEquals(
    "login returns a fresh access token",
    loggedIn.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "login returns a fresh refresh token",
    loggedIn.token.refresh,
    joined.token.refresh,
  );
  TestValidator.equals(
    "login connection authorization header matches returned access token",
    ownerLoginConnection.headers?.Authorization,
    loggedIn.token.access,
  );
}
