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

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account with verified email
  const adminConnection: api.IConnection = { host: connection.host };
  const joinAdmin: IRedditPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
    username: RandomGenerator.name(),
    display_name: null,
    bio: null,
  };
  // Create admin via join endpoint using actor-specific connection
  await api.functional.redditPlatform.auth.admin.join(adminConnection, {
    body: joinAdmin,
  });
  // Step 2: Login with created admin credentials using actor-specific connection
  const loginAdmin: IRedditPlatformAdmin.ILogin = {
    email: joinAdmin.email,
    password: joinAdmin.password,
  };
  const output: IRedditPlatformAdmin.IAuthorized =
    await api.functional.redditPlatform.auth.admin.login(adminConnection, {
      body: loginAdmin,
    });
  // Step 3: Validate response structure with typia.assert
  typia.assert(output);
}
