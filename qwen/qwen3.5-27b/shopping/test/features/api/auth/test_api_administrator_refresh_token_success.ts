import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test successful administrator token refresh after join.
 *
 * Validates the complete administrator token refresh workflow, ensuring that expired or expiring access tokens can be renewed using a valid refresh token without requiring re-authentication. The test verifies that new tokens are generated with correct expiration times and that token rotation occurs properly.
 *
 * Special attention is given to verifying that the refresh token is rotated (new refresh token is issued) and that the administrator identity information remains consistent across the refresh operation.
 *
 * 1. Register a new administrator account via authorize_administrator_join with valid email and password credentials.
 * 2. Capture the refresh_token from the IShoppingMallAdministrator.IAuthorized response.
 * 3. Call authorize_administrator_refresh with the captured refresh_token in the request body.
 * 4. Verify the response returns IShoppingMallAdministrator.IAuthorized with new access and refresh tokens.
 * 5. Verify that both tokens are rotated (different from the original tokens).
 * 6. Confirm the administrator identity fields are preserved and valid.
 */
export async function test_api_administrator_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator and obtain initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_administrator_join(adminConnection, {
    body: undefined,
  });
  typia.assert(initialAuth);
  // 2. Extract the refresh token from initial authorization
  const initialRefreshToken = initialAuth.token.refresh;
  // 3. Create a new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Call refresh endpoint with the captured refresh token
  const refreshedAuth = await authorize_administrator_refresh(
    refreshConnection,
    {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IShoppingMallAdministrator.IRefresh,
    },
  );
  typia.assert(refreshedAuth);
  // 5. Verify tokens are rotated (new tokens are different from original)
  TestValidator.notEquals(
    "access token rotated",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    initialRefreshToken,
    refreshedAuth.token.refresh,
  );
  // 6. Verify administrator identity is preserved
  TestValidator.equals(
    "administrator id preserved",
    initialAuth.id,
    refreshedAuth.id,
  );
  TestValidator.equals(
    "administrator email preserved",
    initialAuth.email,
    refreshedAuth.email,
  );
  TestValidator.equals(
    "administrator grade is regular",
    refreshedAuth.grade,
    "regular",
  );
  TestValidator.equals("administrator not banned", refreshedAuth.banned, false);
  TestValidator.equals(
    "administrator not deleted",
    refreshedAuth.deleted_at,
    null,
  );
  // 7. Verify timestamps are valid
  TestValidator.predicate(
    "expired_at is in the future",
    () => new Date(refreshedAuth.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    () => new Date(refreshedAuth.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    () =>
      new Date(refreshedAuth.token.refreshable_until) >
      new Date(refreshedAuth.token.expired_at),
  );
}
