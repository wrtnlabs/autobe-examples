import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the primary success path for administrator login authentication.
 *
 * This test validates that when an administrator with valid credentials
 * attempts to log in, the system correctly authenticates them and returns
 * proper authorization tokens.
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate test credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // 2. Create a new administrator account for testing
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(joinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  typia.assert(joinResult);
  // Verify join was successful
  TestValidator.equals("join email matches", joinResult.email, adminEmail);
  // 3. Create a new admin connection for login
  const loginConnection: api.IConnection = { host: connection.host };
  // 4. Login with the registered credentials
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  typia.assert(loginResult);
  // 5. Validate administrator identity
  TestValidator.predicate("admin id exists", loginResult.id !== undefined);
  TestValidator.equals("admin email matches", loginResult.email, adminEmail);
  TestValidator.predicate(
    "created_at exists",
    loginResult.created_at !== undefined,
  );
  // 6. Validate authorization tokens
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access !== undefined,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh !== undefined,
  );
  TestValidator.predicate(
    "expired_at exists",
    loginResult.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until exists",
    loginResult.token.refreshable_until !== undefined,
  );
  // 7. Validate tokens are non-empty strings
  TestValidator.predicate(
    "access token is non-empty",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loginResult.token.refresh.length > 0,
  );
  // 8. Validate timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(loginResult.token.expired_at);
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
}
