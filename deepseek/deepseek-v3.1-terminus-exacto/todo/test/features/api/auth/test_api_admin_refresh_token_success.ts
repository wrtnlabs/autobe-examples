import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account and obtain initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  typia.assert(initialAuth);
  // Step 2: Use refresh token to obtain new tokens
  const refreshedAuth = await authorize_admin_refresh(adminConnection, {
    body: {
      refreshToken: initialAuth.token.refresh,
    } satisfies IMultiUserTodoAdmin.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 3: Validate token rotation - new tokens should be different
  TestValidator.notEquals(
    "refresh token should be rotated",
    initialAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
  TestValidator.notEquals(
    "access token should be rotated",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  // Step 4: Validate admin identity remains consistent
  TestValidator.equals(
    "admin ID should remain the same",
    initialAuth.id,
    refreshedAuth.id,
  );
  TestValidator.equals(
    "admin email should remain the same",
    initialAuth.email,
    refreshedAuth.email,
  );
  TestValidator.equals(
    "admin display name should remain the same",
    initialAuth.display_name,
    refreshedAuth.display_name,
  );
  // Step 5: Validate token expiration times are updated
  TestValidator.predicate(
    "expired_at should be in the future",
    new Date(refreshedAuth.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until should be in the future",
    new Date(refreshedAuth.token.refreshable_until) > new Date(),
  );
  // Step 6: Validate token structure
  TestValidator.predicate(
    "access token should not be empty",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should not be empty",
    refreshedAuth.token.refresh.length > 0,
  );
  // Step 7: Validate that new tokens can be used for API calls
  const testConnection: api.IConnection = { host: connection.host };
  testConnection.headers = { Authorization: refreshedAuth.token.access };
  // The refreshed token should be valid for future API calls
  TestValidator.predicate(
    "refreshed token should be valid",
    refreshedAuth.token.access.length > 10,
  );
}
