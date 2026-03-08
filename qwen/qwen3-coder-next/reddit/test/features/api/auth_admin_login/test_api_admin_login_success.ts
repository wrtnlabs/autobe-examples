import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
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
  // 1. Create admin account first
  const adminJoinData = {
    email: (typia.random<string>() + "@example.com") satisfies string & tags.MinLength<1> & tags.Format<"email">,
    password: typia.random<string & tags.MaxLength<72>>().padEnd(8, "a") satisfies string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">,
    username: RandomGenerator.name(1) satisfies string & tags.MinLength<1> & tags.MaxLength<30>,
    display_name: RandomGenerator.name() satisfies string & tags.MinLength<1> & tags.MaxLength<50>,
    bio: null satisfies (string & tags.MaxLength<500>) | null,
    avatar_url: null satisfies (string & tags.MaxLength<80000> & tags.Format<"uri">) | null,
  } satisfies IRedditLikeAdmin.IJoin;
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: adminJoinData,
  });
  typia.assert(adminUser);
  // 2. Login with the created admin credentials
  const loginData: IRedditLikeAdmin.ILogin = {
    email: typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(adminUser.email),
    password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">>(adminJoinData.password),
  };
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: loginData,
  });
  typia.assert(loginResult);
  // 3. Validate response structure
  TestValidator.equals("email matches", loginResult.email, adminUser.email);
  TestValidator.equals(
    "username matches",
    loginResult.username,
    adminUser.username,
  );
  TestValidator.equals(
    "display_name matches",
    loginResult.display_name,
    adminUser.display_name,
  );
  // Validate admin summary
  TestValidator.equals("admin id matches", loginResult.admin.id, adminUser.id);
  TestValidator.equals(
    "admin username matches",
    loginResult.admin.username,
    adminUser.username,
  );
  TestValidator.equals(
    "admin display_name matches",
    loginResult.admin.display_name,
    adminUser.display_name,
  );
  // Validate token structure
  TestValidator.predicate(
    "has valid access token",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has valid expired_at",
    typeof loginResult.token.expired_at === "string" &&
      loginResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has valid refreshable_until",
    typeof loginResult.token.refreshable_until === "string" &&
      loginResult.token.refreshable_until.length > 0,
  );
}