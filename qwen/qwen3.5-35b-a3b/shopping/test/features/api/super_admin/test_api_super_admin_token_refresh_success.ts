import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator to obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_super_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(joinResponse);
  // Store original tokens for validation
  const originalAccessToken = joinResponse.access;
  const originalRefreshToken = joinResponse.refresh;
  const originalExpiredAt = joinResponse.expired_at;
  // 2. Create a new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Perform token refresh using the refresh token from join
  const refreshResponse = await authorize_super_admin_refresh(
    refreshConnection,
    {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IEcommerceMallSuperAdmin.IRefresh,
    },
  );
  typia.assert(refreshResponse);
  // 4. Validate that new tokens are returned (token rotation)
  TestValidator.notEquals(
    "access token changed after refresh",
    originalAccessToken,
    refreshResponse.access,
  );
  TestValidator.notEquals(
    "refresh token changed after refresh",
    originalRefreshToken,
    refreshResponse.refresh,
  );
  TestValidator.notEquals(
    "access token expiration changed after refresh",
    originalExpiredAt,
    refreshResponse.expired_at,
  );
  // 5. Validate that identity remains the same
  TestValidator.equals(
    "super administrator ID unchanged",
    joinResponse.id,
    refreshResponse.id,
  );
  TestValidator.equals(
    "email unchanged after refresh",
    joinResponse.email,
    refreshResponse.email,
  );
  TestValidator.equals(
    "display name unchanged after refresh",
    joinResponse.displayName,
    refreshResponse.displayName,
  );
  // 6. Validate that all expected response fields exist
  TestValidator.equals(
    "fullName present in refresh response",
    refreshResponse.fullName !== undefined,
    true,
  );
  TestValidator.equals(
    "grade present in refresh response",
    refreshResponse.grade !== undefined,
    true,
  );
  TestValidator.equals(
    "status present in refresh response",
    refreshResponse.status !== undefined,
    true,
  );
  TestValidator.equals(
    "createdAt present in refresh response",
    refreshResponse.createdAt !== undefined,
    true,
  );
  TestValidator.equals(
    "updatedAt present in refresh response",
    refreshResponse.updatedAt !== undefined,
    true,
  );
  TestValidator.equals(
    "deletedAt present in refresh response",
    refreshResponse.deletedAt !== undefined,
    true,
  );
  TestValidator.equals(
    "token present in refresh response",
    refreshResponse.token !== undefined,
    true,
  );
  TestValidator.equals(
    "refreshable_until present in refresh response",
    refreshResponse.token.refreshable_until !== undefined,
    true,
  );
}
