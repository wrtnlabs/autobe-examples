import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platformadmin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new platform admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinResponse = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: joinEmail,
      password,
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  typia.assert(joinResponse);
  // Extract token from join response
  const { token: joinToken } = joinResponse;
  // 2. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_platform_admin_login(loginConnection, {
    body: {
      email: joinEmail,
      password,
    } satisfies IRedditCommunityPlatformAdmin.ILogin,
  });
  typia.assert(loginResponse);
  // 3. Validate that login response token equals join response token
  TestValidator.equals(
    "user context matches after login",
    joinToken,
    loginResponse.token,
  );
}