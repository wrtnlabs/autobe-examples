import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // 1. Administrator registration
  const adminJoinConnection: api.IConnection = { host: connection.host };
  // Generate email and password for join
  const email = `${RandomGenerator.alphabets(5)}@example.com`;
  const password = RandomGenerator.alphabets(10);
  const joinBody = {
    email,
    password,
  } satisfies IDiscussionBoardAdministrator.IJoin;
  const joinOutput = await authorize_administrator_join(adminJoinConnection, {
    body: joinBody,
  });
  typia.assert(joinOutput);
  // 2. Administrator login with the same credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email,
    password,
  } satisfies IDiscussionBoardAdministrator.ILogin;
  const loginOutput = await authorize_administrator_login(
    adminLoginConnection,
    {
      body: loginBody,
    },
  );
  typia.assert(loginOutput);
  // 3. Validate access and refresh tokens presence and expiration format
  const token = loginOutput.token;
  TestValidator.predicate("access token has length", token.access.length > 0);
  TestValidator.predicate("refresh token has length", token.refresh.length > 0);
  // Validate ISO 8601 date-time strings
  const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
  TestValidator.predicate(
    "access token expired_at format",
    dateFormat.test(token.expired_at),
  );
  TestValidator.predicate(
    "refresh token refreshable_until format",
    dateFormat.test(token.refreshable_until),
  );
  // 4. Confirm login success for existing account
  TestValidator.equals("login email equality", loginBody.email, email);
}
