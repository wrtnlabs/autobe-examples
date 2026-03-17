import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_login_concurrent_sessions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator account
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(joinConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. First login — create session 1
  const session1Connection: api.IConnection = { host: connection.host };
  const session1 = await authorize_super_admin_login(session1Connection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallSuperAdmin.ILogin,
  });
  typia.assert(session1);
  // 3. Second login — create session 2 (should NOT invalidate session 1)
  const session2Connection: api.IConnection = { host: connection.host };
  const session2 = await authorize_super_admin_login(session2Connection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallSuperAdmin.ILogin,
  });
  typia.assert(session2);
  // 4. Validate that both sessions have non-empty access and refresh tokens
  TestValidator.predicate(
    "session1 access token is non-empty",
    session1.token.access.length > 0,
  );
  TestValidator.predicate(
    "session2 access token is non-empty",
    session2.token.access.length > 0,
  );
  TestValidator.predicate(
    "session1 refresh token is non-empty",
    session1.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "session2 refresh token is non-empty",
    session2.token.refresh.length > 0,
  );
  // 5. Validate that both sessions have distinct access tokens
  TestValidator.notEquals(
    "session1 and session2 access tokens must be different",
    session1.token.access,
    session2.token.access,
  );
  // 6. Validate that both sessions have distinct refresh tokens
  TestValidator.notEquals(
    "session1 and session2 refresh tokens must be different",
    session1.token.refresh,
    session2.token.refresh,
  );
}
