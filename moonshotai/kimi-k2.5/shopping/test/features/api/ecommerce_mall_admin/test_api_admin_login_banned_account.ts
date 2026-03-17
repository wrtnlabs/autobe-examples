import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // Create a new admin account to test banned login restrictions
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"url">>(),
    referrer: typia.random<string & tags.Format<"url">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, { body: joinBody });
  typia.assert(admin);
  // Note: In a complete system, the account status would be set to 'banned'
  // by a super administrator via an admin management endpoint here
  // Attempt to login with credentials for the banned account
  // This should be rejected with an appropriate ban error message
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "banned account login rejected with error",
    async () => {
      await authorize_admin_login(loginConnection, {
        body: {
          email: joinBody.email,
          password: joinBody.password,
        } satisfies IEcommerceMallAdmin.ILogin,
      });
    },
  );
  // Verify no authorization header was set on the login connection
  // (no JWT tokens should be returned for banned accounts)
  TestValidator.equals(
    "no auth token for banned account",
    loginConnection.headers?.Authorization,
    undefined,
  );
}
