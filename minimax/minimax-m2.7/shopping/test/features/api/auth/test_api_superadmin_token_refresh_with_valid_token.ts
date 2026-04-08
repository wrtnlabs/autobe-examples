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

export async function test_api_superadmin_token_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new super admin account and get initial tokens
  const initialResponse = await authorize_super_admin_join(connection, {});
  typia.assert(initialResponse);
  // Store original tokens and identity for comparison
  const originalAccessToken = initialResponse.token.access;
  const originalRefreshToken = initialResponse.token.refresh;
  const originalId = initialResponse.id;
  const originalEmail = initialResponse.email;
  // 2. Create new connection and call refresh endpoint with original refresh token
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshedResponse = await authorize_super_admin_refresh(
    refreshedConnection,
    {
      body: {
        refreshToken: originalRefreshToken,
      } satisfies IEcommerceMallSuperAdmin.IRefresh,
    },
  );
  typia.assert(refreshedResponse);
  // 3. Validate new tokens are different from original (proving refresh occurred)
  TestValidator.notEquals(
    "new access token should be different from original",
    originalAccessToken,
    refreshedResponse.token.access,
  );
  TestValidator.notEquals(
    "new refresh token should be different from original",
    originalRefreshToken,
    refreshedResponse.token.refresh,
  );
  // 4. Validate super admin identity matches original
  TestValidator.equals(
    "super admin id should remain the same",
    originalId,
    refreshedResponse.id,
  );
  TestValidator.equals(
    "super admin email should remain the same",
    originalEmail,
    refreshedResponse.email,
  );
  // 5. Validate token structure contains all required fields
  TestValidator.predicate(
    "response should have valid access token",
    refreshedResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "response should have valid refresh token",
    refreshedResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "response should have valid expired_at timestamp",
    refreshedResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "response should have valid refreshable_until timestamp",
    refreshedResponse.token.refreshable_until.length > 0,
  );
}
