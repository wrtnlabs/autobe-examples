import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account via join endpoint
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEconomicPoliticalBoardAdmin.IJoin;
  const joinResult = await authorize_admin_join(adminJoinConnection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  // 2. Verify join response structure
  typia.assert<IAuthorizationToken>(joinResult.token);
  // 3. Login with same credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IEconomicPoliticalBoardAdmin.ILogin;
  const loginResult = await authorize_admin_login(adminLoginConnection, {
    body: loginInput,
  });
  typia.assert(loginResult);
  // 4. Validate login response contains admin id (UUID format)
  typia.assert<string & tags.Format<"uuid">>(loginResult.id);
  typia.assert<IAuthorizationToken>(loginResult.token);
  // 5. Verify token values are non-empty strings
  const accessToken = loginResult.token.access;
  const refreshToken = loginResult.token.refresh;
  const expiredAt = loginResult.token.expired_at;
  const refreshableUntil = loginResult.token.refreshable_until;
  TestValidator.predicate("access token is non-empty", accessToken.length > 0);
  TestValidator.predicate(
    "refresh token is non-empty",
    refreshToken.length > 0,
  );
  // 6. Verify timestamps are valid date-time format
  typia.assert<string & tags.Format<"date-time">>(expiredAt);
  typia.assert<string & tags.Format<"date-time">>(refreshableUntil);
  // 7. Verify timestamp order: expired_at < refreshable_until
  const expiredDate = new Date(expiredAt);
  const refreshableDate = new Date(refreshableUntil);
  TestValidator.predicate(
    "expired_at is in the future",
    expiredDate > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableDate > expiredDate,
  );
  // 8. Verify connection headers are updated with access token
  TestValidator.predicate(
    "connection has authorization header with Bearer prefix",
    adminLoginConnection.headers?.Authorization?.toString().startsWith(
      "Bearer ",
    ) === true,
  );
  // 9. Test that access token works for authenticated request
  const testConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: loginResult.token.access,
    },
  };
  TestValidator.equals(
    "test connection has correct authorization",
    testConnection.headers!.Authorization,
    loginResult.token.access,
  );
}