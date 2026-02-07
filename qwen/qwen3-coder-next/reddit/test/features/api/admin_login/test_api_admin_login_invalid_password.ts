import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_invalid_password(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody: IRedditPlatformAdmin.IJoin =
    typia.random<IRedditPlatformAdmin.IJoin>();
  const registeredAdmin = await authorize_admin_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(registeredAdmin);
  // Step 2: Attempt login with wrong password
  const wrongPasswordBody: IRedditPlatformAdmin.ILogin = {
    ...joinBody,
    password: "wrong_password_12345",
  } satisfies IRedditPlatformAdmin.ILogin;
  await TestValidator.error("invalid password should throw 401", async () => {
    await api.functional.redditPlatform.auth.admin.login(adminConnection, {
      body: wrongPasswordBody,
    });
  });
}
