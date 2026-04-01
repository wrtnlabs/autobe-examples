import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test successful token refresh for super administrator.
 *
 * This test validates the complete token refresh workflow:
 * 1. Register a new super administrator account to obtain initial tokens
 * 2. Call the refresh endpoint with the valid refresh token
 * 3. Verify new tokens are generated and different from originals
 * 4. Verify account information remains consistent
 * 5. Validate old refresh token is invalidated after refresh
 */
export async function test_api_super_administrator_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new super administrator account to obtain initial tokens
  const initialAuth = await authorize_super_administrator_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  typia.assert(initialAuth);
  // Store original token values for comparison
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  // 2. Create a new connection for refresh operation using the original access token
  const refreshConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${originalAccessToken}`,
    },
  };
  // 3. Call refresh endpoint with the original refresh token
  const refreshedAuth = await authorize_super_administrator_refresh(
    refreshConnection,
    {
      body: {
        refresh: originalRefreshToken,
      } satisfies IShoppingMallSuperAdministrator.IRefresh,
    },
  );
  typia.assert(refreshedAuth);
  // 4. Verify account information remains consistent
  TestValidator.equals(
    "super admin id matches",
    initialAuth.id,
    refreshedAuth.id,
  );
  TestValidator.equals("email matches", initialAuth.email, refreshedAuth.email);
  TestValidator.equals(
    "created_at matches",
    initialAuth.created_at,
    refreshedAuth.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    initialAuth.updated_at,
    refreshedAuth.updated_at,
  );
  TestValidator.equals(
    "deleted_at matches",
    initialAuth.deleted_at,
    refreshedAuth.deleted_at,
  );
  // 5. Verify new tokens are different from original tokens
  TestValidator.notEquals(
    "access token changed",
    originalAccessToken,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed",
    originalRefreshToken,
    refreshedAuth.token.refresh,
  );
  // 6. Test that old refresh token is invalidated - attempt to use it again
  const oldTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${refreshedAuth.token.access}`,
    },
  };
  await TestValidator.error("old refresh token invalidated", async () => {
    await authorize_super_administrator_refresh(oldTokenConnection, {
      body: {
        refresh: originalRefreshToken,
      } satisfies IShoppingMallSuperAdministrator.IRefresh,
    });
  });
}
