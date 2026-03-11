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

export async function test_api_admin_login_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account for testing
  const adminConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditPlatformAdmin.ILogin;
  const joinBody = {
    email: credentials.email,
    username: RandomGenerator.alphaNumeric(12),
    password: credentials.password,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    avatar_url: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditPlatformAdmin.IJoin;
  const createdAdmin = await authorize_admin_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(createdAdmin);
  TestValidator.equals(
    "admin account created successfully",
    createdAdmin.is_active,
    true,
  );
  // Attempt login with the created admin account
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: credentials.email,
    password: credentials.password,
  } satisfies IRedditPlatformAdmin.ILogin;
  const loginResponse = await authorize_admin_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loginResponse);
  TestValidator.equals(
    "login successful for valid account",
    loginResponse.is_active,
    true,
  );
}
