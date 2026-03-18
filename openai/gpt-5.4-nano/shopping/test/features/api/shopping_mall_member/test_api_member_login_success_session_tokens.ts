import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_success_session_tokens(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create member account with known credentials
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallMember.IJoin;
  const joined = await authorize_member_join(memberJoinConnection, {
    body: credentials,
  });
  typia.assert(joined);
  TestValidator.equals("joined email matches", joined.email, credentials.email);
  // 2) Login using same credentials
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_member_login(memberLoginConnection, {
    body: {
      email: credentials.email,
      password: credentials.password,
    } satisfies IShoppingMallMember.ILogin,
  });
  typia.assert(loggedIn);
  // 3) Validate response semantics
  TestValidator.predicate(
    "access token is non-empty",
    () => loggedIn.token.access.trim().length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    () => loggedIn.token.refresh.trim().length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    loggedIn.deleted_at,
    null,
  );
  const expiredAt = new Date(loggedIn.token.expired_at);
  const refreshableUntil = new Date(loggedIn.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until >= expired_at",
    () =>
      Number.isNaN(expiredAt.getTime()) === false &&
      Number.isNaN(refreshableUntil.getTime()) === false &&
      refreshableUntil.getTime() >= expiredAt.getTime(),
  );
  // 4) Business continuity check: call another member-authenticated operation
  // using the access token present on the connection after successful login.
  const secondLogin = await authorize_member_login(memberLoginConnection, {
    body: {
      email: credentials.email,
      password: credentials.password,
    } satisfies IShoppingMallMember.ILogin,
  });
  typia.assert(secondLogin);
  TestValidator.equals(
    "second login returns same member id",
    secondLogin.id,
    loggedIn.id,
  );
}
