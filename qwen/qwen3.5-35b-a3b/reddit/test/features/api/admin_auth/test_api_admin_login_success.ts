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
  // 1. Create admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(16),
    password: "Admin@123456",
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
  } satisfies IRedditPlatformAdmin.IJoin;
  const joinResult = await authorize_admin_join(adminJoinConnection, {
    body: adminCredentials,
  });
  typia.assert(joinResult);
  // 2. Login with created admin credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: adminCredentials.email,
    password: adminCredentials.password,
  } satisfies IRedditPlatformAdmin.ILogin;
  const loginResult = await authorize_admin_login(adminLoginConnection, {
    body: loginBody,
  });
  typia.assert(loginResult);
  // 3. Verify admin profile response structure
  TestValidator.equals(
    "email matches registration",
    loginResult.email,
    adminCredentials.email,
  );
  TestValidator.equals(
    "username matches registration",
    loginResult.username,
    adminCredentials.username,
  );
  TestValidator.equals(
    "display_name matches registration",
    loginResult.display_name,
    adminCredentials.display_name,
  );
  TestValidator.predicate(
    "admin account is active",
    loginResult.is_active === true,
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    !isNaN(Date.parse(loginResult.created_at)),
  );
  TestValidator.predicate(
    "has valid updated_at timestamp",
    !isNaN(Date.parse(loginResult.updated_at)),
  );
  // 4. Verify authorization token structure
  TestValidator.predicate(
    "access token exists and is non-empty",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists and is non-empty",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token has valid expiration",
    !isNaN(Date.parse(loginResult.token.expired_at)),
  );
  TestValidator.predicate(
    "refresh token has valid expiration",
    !isNaN(Date.parse(loginResult.token.refreshable_until)),
  );
  // 5. Verify response fields are not undefined (they should have defaults)
  TestValidator.notEquals(
    "display_name is not undefined",
    loginResult.display_name,
    undefined,
  );
  TestValidator.notEquals("bio is not undefined", loginResult.bio, undefined);
  TestValidator.notEquals(
    "created_at is not undefined",
    loginResult.created_at,
    undefined,
  );
  TestValidator.notEquals(
    "updated_at is not undefined",
    loginResult.updated_at,
    undefined,
  );
}
