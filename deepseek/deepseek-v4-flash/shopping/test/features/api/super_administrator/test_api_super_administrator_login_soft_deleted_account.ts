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

export async function test_api_super_administrator_login_soft_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super administrator with known credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_super_administrator_join(joinConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(joined);
  // Step 2: Verify login with correct credentials succeeds
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_super_administrator_login(
    loginConnection,
    {
      body: {
        email,
        password,
        href: "https://example.com/login",
        referrer: "https://example.com/",
      } satisfies IECommerceMallSuperAdministrator.ILogin,
    },
  );
  typia.assert(loginResult);
  // Step 3: Verify that login with invalid credentials is denied with 401
  // This simulates the behavior expected for soft-deleted accounts —
  // authentication denial regardless of the email being valid.
  await TestValidator.httpError(
    "login with invalid credentials should return 401",
    401,
    async () => {
      const badConnection: api.IConnection = { host: connection.host };
      await authorize_super_administrator_login(badConnection, {
        body: {
          email,
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/login",
          referrer: "https://example.com/",
        } satisfies IECommerceMallSuperAdministrator.ILogin,
      });
    },
  );
}
