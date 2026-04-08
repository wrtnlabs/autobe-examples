import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_login_mismatched_credentials_denied(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate that administrator login rejects mismatched credentials.
   *
   * This test prepares two distinct administrator accounts and then attempts
   * to authenticate using the email from one account with the password from
   * the other account. It verifies that the login endpoint enforces exact
   * credential matching and does not issue authorization tokens for a
   * cross-account password attempt.
   *
   * 1. Create two administrator accounts with unique credentials.
   * 2. Attempt login with administrator #1 email and administrator #2 password.
   * 3. Confirm the authentication request fails as expected.
   */
  const firstConnection: api.IConnection = { host: connection.host };
  const secondConnection: api.IConnection = { host: connection.host };
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const firstPassword = typia.random<string & tags.Format<"password">>();
  const secondPassword = typia.random<string & tags.Format<"password">>();
  const firstAdmin = await authorize_administrator_join(firstConnection, {
    body: {
      email: firstEmail,
      password: firstPassword,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(firstAdmin);
  const secondAdmin = await authorize_administrator_join(secondConnection, {
    body: {
      email: secondEmail,
      password: secondPassword,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(secondAdmin);
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "administrator login should reject mismatched credentials",
    [401, 403],
    async () => {
      await authorize_administrator_login(loginConnection, {
        body: {
          email: firstEmail,
          password: secondPassword,
        } satisfies IMallPlatformAdministrator.ILogin,
      });
    },
  );
}
