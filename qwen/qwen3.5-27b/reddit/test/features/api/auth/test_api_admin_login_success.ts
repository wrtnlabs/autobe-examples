import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful administrator login with valid credentials.
 * 1. Create admin account with valid registration data
 * 2. Login with the created admin credentials
 * 3. Validate response contains admin profile and authorization tokens
 * 4. Verify tokens are non-empty and account is active (deletedAt is null)
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: null,
      avatar: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneAdmin.IJoin,
  });
  typia.assert(joinResult);
  // Store admin credentials for login
  const adminEmail = joinResult.email;
  const adminId = joinResult.id;
  // 2. Login with the created admin credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: adminEmail,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    } satisfies IRedditCloneAdmin.ILogin,
  });
  typia.assert(loginResult);
  // 3. Validate business logic - admin identity consistency
  TestValidator.equals("admin ID matches", loginResult.id, adminId);
  TestValidator.equals("admin email matches", loginResult.email, adminEmail);
  // 4. Verify account is active (deletedAt is null)
  TestValidator.equals(
    "account is active (deletedAt is null)",
    loginResult.deletedAt,
    null,
  );
  // 5. Verify authorization tokens are present and non-empty
  TestValidator.predicate(
    "access token is non-empty",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at exists",
    loginResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until exists",
    loginResult.token.refreshable_until.length > 0,
  );
}
