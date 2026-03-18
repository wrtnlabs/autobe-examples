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

export async function test_api_admin_login_success_tokens_issued(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create an admin account (join) as prerequisite
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const joined: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminJoinConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(joined);
  // 2) Login with the same credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const loggedIn: IShoppingMallAdmin.IAuthorized = await authorize_admin_login(
    adminLoginConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IShoppingMallAdmin.ILogin,
    },
  );
  typia.assert(loggedIn);
  // 3) Validate token fields (business logic)
  TestValidator.predicate(
    "access token should be non-empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    loggedIn.token.refresh.length > 0,
  );
  const expiredAtMs = Date.parse(loggedIn.token.expired_at);
  const refreshableUntilMs = Date.parse(loggedIn.token.refreshable_until);
  TestValidator.predicate(
    "expired_at should be <= refreshable_until",
    expiredAtMs <= refreshableUntilMs,
  );
  // 4) Validate identity matches authenticated administrator identity
  TestValidator.equals("admin id should match", loggedIn.id, joined.id);
  TestValidator.equals(
    "admin email should match",
    loggedIn.email,
    joined.email,
  );
  // 5) Store access token for subsequent admin-only requests (placeholder assertion)
  const adminAccessToken: string = loggedIn.token.access;
  TestValidator.predicate(
    "stored access token should remain non-empty",
    adminAccessToken.length > 0,
  );
}
