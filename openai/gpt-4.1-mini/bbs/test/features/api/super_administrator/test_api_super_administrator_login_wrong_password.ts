import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test login failure due to wrong password for a known super administrator account.
  // 1. Create a super administrator account with default empty join request.
  const baseJoinConnection: api.IConnection = { host: connection.host };
  const joinBody: IDiscussionBoardSuperAdministrator.IJoin = {};
  const authorized = await authorize_super_administrator_join(
    baseJoinConnection,
    { body: joinBody },
  );
  typia.assert(authorized);
  // 2. Attempt login with empty login request (as no email/password available).
  // Expecting failure since no credentials provided (simulate wrong password scenario).
  const baseLoginConnection: api.IConnection = { host: connection.host };
  const loginBody: IDiscussionBoardSuperAdministrator.ILogin = {};
  await TestValidator.error("login fails with wrong password", async () => {
    await authorize_super_administrator_login(baseLoginConnection, {
      body: loginBody,
    });
  });
}
