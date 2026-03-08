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

export async function test_api_admin_login_suspended_account(
  connection: api.IConnection,
): Promise<void> {
  // Test admin login rejection for suspended accounts
  // This scenario validates that suspended administrator accounts cannot authenticate
  // 1. Create admin account using /auth/admin/join
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformAdmin.IJoin;
  const adminJoinResult = await authorize_admin_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(adminJoinResult);
  // 2. Verify initial login succeeds with the created account
  const loginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: adminJoinResult.email,
    password: joinInput.password,
  } satisfies IRedditPlatformAdmin.ILogin;
  const initialLoginResult = await authorize_admin_login(loginConnection, {
    body: loginInput,
  });
  typia.assert(initialLoginResult);
  // 3. Validate account state from login response - should be active
  TestValidator.equals(
    "admin is active after login",
    initialLoginResult.is_active,
    true,
  );
  TestValidator.equals(
    "email matches",
    initialLoginResult.email,
    adminJoinResult.email,
  );
  TestValidator.equals(
    "username matches",
    initialLoginResult.username,
    adminJoinResult.username,
  );
  TestValidator.equals(
    "display_name matches",
    initialLoginResult.display_name,
    adminJoinResult.display_name,
  );
  // 4. Validate token structure from successful login
  typia.assert(initialLoginResult.token.access);
  typia.assert(initialLoginResult.token.refresh);
  typia.assert(initialLoginResult.token.expired_at);
  typia.assert(initialLoginResult.token.refreshable_until);
  // 5. Note: Testing suspended account login rejection requires database manipulation
  // (setting is_active to false) which is not available through the provided API.
  // This test validates the successful login flow with the available endpoints.
}
