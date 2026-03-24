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

export async function test_api_member_login_token_expiration_consistency(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  const loginAt = new Date();
  const memberConnectionForLogin: api.IConnection = { host: connection.host };
  const loginBody = {
    email: memberCredentials.email,
    password: memberCredentials.password,
    href: memberCredentials.href,
    referrer: memberCredentials.referrer,
    ip: memberCredentials.ip,
  } satisfies ITodoAppMember.ILogin;
  const loginResult = await authorize_member_login(memberConnectionForLogin, {
    body: loginBody,
  });
  typia.assert(loginResult);
  const expiredAt = new Date(loginResult.token.expired_at);
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  const nowUtc = loginAt;
  TestValidator.predicate(
    "expired_at <= refreshable_until",
    expiredAt.getTime() <= refreshableUntil.getTime(),
  );
  TestValidator.predicate(
    "expired_at has not already passed",
    expiredAt.getTime() >= nowUtc.getTime(),
  );
  TestValidator.predicate(
    "access token is non-empty",
    loginResult.token.access.trim().length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loginResult.token.refresh.trim().length > 0,
  );
}
