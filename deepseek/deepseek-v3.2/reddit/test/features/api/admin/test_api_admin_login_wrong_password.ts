import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate credentials and create admin account via join
  const adminConnection: api.IConnection = { host: connection.host };
  const correctPassword = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: correctPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(joinResult);
  // 2. Store correct email
  const correctEmail = joinResult.email;
  // 3. Create new connection for login attempt
  const loginConnection: api.IConnection = { host: connection.host };
  // 4. Attempt login with wrong password
  const wrongPassword = correctPassword + "WRONG";
  await TestValidator.error(
    "admin login with wrong password should fail",
    async () => {
      const result = await authorize_admin_login(loginConnection, {
        body: {
          email: correctEmail,
          password: wrongPassword,
        } satisfies ICommunityPlatformAdmin.ILogin,
      });
      typia.assert(result);
    },
  );
  // 5. Verify no Authorization header set
  TestValidator.predicate(
    "connection should have no Authorization header after failed login",
    loginConnection.headers?.Authorization === undefined,
  );
}
