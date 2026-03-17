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

export async function test_api_super_admin_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new actor-specific connection for super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Step 2: Prepare join input with unique email and valid URIs
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Step 3: Call the utility function (mandatory for this endpoint)
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email,
      password,
      href,
      referrer,
    },
  });
  // Step 4: Validate the full response structure
  typia.assert(authorized);
  // Step 5: Validate business logic - email matches input
  TestValidator.equals("email matches input", authorized.email, email);
  // Step 6: Validate account is active (deleted_at must be null)
  TestValidator.equals("account is active", authorized.deleted_at, null);
  // Step 7: Validate tokens are non-empty strings
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  // Step 8: Validate token expiration timestamps are in the future
  const now = new Date().toISOString();
  TestValidator.predicate(
    "access token expires in future",
    authorized.token.expired_at > now,
  );
  TestValidator.predicate(
    "refresh token expires in future",
    authorized.token.refreshable_until > now,
  );
  // Step 9: Validate refreshable_until is beyond expired_at
  TestValidator.predicate(
    "refreshable_until is beyond expired_at",
    authorized.token.refreshable_until >= authorized.token.expired_at,
  );
  // Step 10: Confirm the connection headers are updated with access token
  // The authorize function internally sets connection.headers.Authorization = token.access
  // This means superAdminConnection can be used for subsequent authenticated calls
  TestValidator.predicate(
    "connection has Authorization header set",
    superAdminConnection.headers !== undefined &&
      superAdminConnection.headers.Authorization === authorized.token.access,
  );
}
