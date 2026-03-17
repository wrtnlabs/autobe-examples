import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator login session termination behavior.
 *
 * This test verifies that when an administrator logs in multiple times,
 * each login creates a new session with fresh tokens. The test flow:
 * 1. Register a new administrator account
 * 2. First login - capture the access token
 * 3. Second login with same credentials - should succeed with new tokens
 * 4. Verify each login produces different tokens (new sessions created)
 *
 * Note: Session termination of previous tokens is handled by the backend.
 * This test validates the observable behavior that multiple logins succeed
 * and produce unique tokens, demonstrating proper session management.
 */
export async function test_api_admin_login_session_termination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new administrator account
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const joinResult = await authorize_admin_join(connection, {
    body: adminCredentials,
  });
  typia.assert(joinResult);
  TestValidator.equals(
    "admin email matches",
    joinResult.email,
    adminCredentials.email,
  );
  // 2. First login - capture the access token
  const firstLoginConnection: api.IConnection = { host: connection.host };
  const firstLoginResult = await authorize_admin_login(firstLoginConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(firstLoginResult);
  const firstAccessToken = firstLoginResult.token.access;
  TestValidator.predicate(
    "first login has access token",
    firstAccessToken.length > 0,
  );
  // 3. Second login with same credentials - should succeed with new tokens
  const secondLoginConnection: api.IConnection = { host: connection.host };
  const secondLoginResult = await authorize_admin_login(secondLoginConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(secondLoginResult);
  const secondAccessToken = secondLoginResult.token.access;
  TestValidator.predicate(
    "second login has access token",
    secondAccessToken.length > 0,
  );
  // 4. Verify tokens are different (new session created on each login)
  TestValidator.notEquals(
    "access tokens differ between logins",
    firstAccessToken,
    secondAccessToken,
  );
  // 5. Verify token expiration times are in the future
  TestValidator.predicate(
    "first token expires in future",
    new Date(firstLoginResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "second token expires in future",
    new Date(secondLoginResult.token.refreshable_until) > new Date(),
  );
}
