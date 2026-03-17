import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register super admin to obtain initial tokens
  const superAdminConnection: api.IConnection = { host: connection.host };
  const initialAuth = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(initialAuth);
  // Store original tokens for comparison
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  // Step 2: Create isolated connection and refresh tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_super_admin_refresh(refreshConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IEcommerceMallSuperAdmin.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 3: Validate token rotation - new tokens must differ from original
  TestValidator.notEquals(
    "access token rotated",
    originalAccessToken,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    refreshedAuth.token.refresh,
  );
  // Step 4: Validate super admin profile information
  TestValidator.equals(
    "super admin id matches",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "super admin email matches",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "super admin grade is super_admin",
    refreshedAuth.grade,
    "super_admin",
  );
  // Step 5: Validate token expiration metadata
  TestValidator.predicate(
    "expired_at is valid",
    new Date(refreshedAuth.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until is valid",
    new Date(refreshedAuth.token.refreshable_until).getTime() > Date.now(),
  );
  // Step 6: Verify connection is ready for subsequent authenticated requests
  TestValidator.equals(
    "connection authorization header updated",
    refreshConnection.headers?.Authorization,
    refreshedAuth.token.access,
  );
}
