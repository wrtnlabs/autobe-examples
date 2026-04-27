import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test that super administrator login is rejected when an incorrect password is provided.
 *
 * First creates a super administrator account with known email and password credentials via the join endpoint. Then attempts to authenticate using the same email but a deliberately wrong password, verifying that the server returns a 401 Unauthorized HTTP error.
 *
 * 1. Creates a super administrator account recording the email and original password.
 * 2. Attempts login with the same email + a wrong password.
 * 3. Asserts that the login attempt fails with HTTP 401 status.
 */
export async function test_api_super_administrator_login_incorrect_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super administrator account with known credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email,
        password,
      },
    },
  );
  typia.assert(authorized);
  // 2. Attempt login with correct email but wrong password -> expect 401
  await TestValidator.httpError(
    "super administrator login with incorrect password",
    401,
    async () => {
      const wrongPassword: string = RandomGenerator.alphaNumeric(16) + "wrong";
      const loginConnection: api.IConnection = { host: connection.host };
      await authorize_super_administrator_login(loginConnection, {
        body: {
          email,
          password: wrongPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IECommerceMallSuperAdministrator.ILogin,
      });
    },
  );
}
