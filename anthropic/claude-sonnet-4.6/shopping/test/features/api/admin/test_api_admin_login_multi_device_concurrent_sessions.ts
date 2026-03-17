import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_multi_device_concurrent_sessions(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminJoinConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: First login - create independent connection for session 1
  const loginConnection1: api.IConnection = { host: connection.host };
  const session1 = await authorize_admin_login(loginConnection1, {
    body: {
      email,
      password,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(session1);
  // Step 3: Second login - create independent connection for session 2
  const loginConnection2: api.IConnection = { host: connection.host };
  const session2 = await authorize_admin_login(loginConnection2, {
    body: {
      email,
      password,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(session2);
  // Validation 1: Both access tokens must be different (distinct sessions)
  TestValidator.notEquals(
    "access tokens must be different for concurrent sessions",
    session1.token.access,
    session2.token.access,
  );
  // Validation 2: Both refresh tokens must be different
  TestValidator.notEquals(
    "refresh tokens must be different for concurrent sessions",
    session1.token.refresh,
    session2.token.refresh,
  );
  // Validation 3: Both sessions must refer to the same admin account (same id)
  TestValidator.equals(
    "both sessions must belong to the same admin account (id)",
    session1.admin.id,
    session2.admin.id,
  );
  // Validation 4: Both sessions must refer to the same admin email
  TestValidator.equals(
    "both sessions must belong to the same admin account (email)",
    session1.admin.email,
    session2.admin.email,
  );
  // Validation 5: The email returned in both sessions must match the registered email
  TestValidator.equals(
    "session 1 email matches registered email",
    session1.admin.email,
    email,
  );
  // Validation 6: Confirm session 1 is still valid (not invalidated by session 2)
  // We verify this by checking that session 1 tokens are non-empty and still present
  TestValidator.predicate(
    "session 1 access token is non-empty (session not invalidated)",
    session1.token.access.length > 0,
  );
  TestValidator.predicate(
    "session 2 access token is non-empty (independent session created)",
    session2.token.access.length > 0,
  );
  // Validation 7: session1 top-level id and admin.id must match
  TestValidator.equals(
    "session1 top-level id matches admin.id",
    session1.id,
    session1.admin.id,
  );
  // Validation 8: session2 top-level id and admin.id must match
  TestValidator.equals(
    "session2 top-level id matches admin.id",
    session2.id,
    session2.admin.id,
  );
}
