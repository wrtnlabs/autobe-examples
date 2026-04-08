import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
export async function test_api_administrator_login_after_join(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new administrator account
  const joinPassword = RandomGenerator.alphaNumeric(12);
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_administrator_join(joinConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: joinPassword,
      grade: "regular" as const,
    },
  });
  typia.assert(joinResult);

  // 2. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_administrator_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: joinPassword,
      ip: "127.0.0.1",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(loginResult);

  // 3. Validate login response contains required fields
  TestValidator.equals(
    "email matches join result",
    loginResult.email,
    joinResult.email,
  );
  TestValidator.equals(
    "display_name matches join result",
    loginResult.display_name,
    joinResult.display_name,
  );
  TestValidator.equals(
    "grade is regular",
    loginResult.grade,
    "regular" as const,
  );
  TestValidator.equals(
    "is_banned is false",
    loginResult.is_banned,
    false,
  );
  TestValidator.equals(
    "id matches join result",
    loginResult.id,
    joinResult.id,
  );

  // 4. Validate token structure
  typia.assert(loginResult.token);
  TestValidator.predicate("access token exists", loginResult.token.access.length > 0);
  TestValidator.predicate("refresh token exists", loginResult.token.refresh.length > 0);
  TestValidator.predicate(
    "expired_at is valid date-time",
    loginResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    loginResult.token.refreshable_until.length > 0,
  );
}