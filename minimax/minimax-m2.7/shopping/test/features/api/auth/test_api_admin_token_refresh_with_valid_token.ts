import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an administrator can successfully refresh their authentication tokens using a valid, non-expired refresh token.
 *
 * Validates the token refresh flow for administrators by:
 * 1. Creating a new administrator account via join to obtain initial access and refresh tokens
 * 2. Extracting the refresh token from the join response
 * 3. Calling the refresh endpoint with the valid refresh token
 * 4. Verifying the response contains new access_token and refresh_token (token rotation)
 * 5. Verifying the response contains admin profile data (id, email, name, timestamps)
 * 6. Verifying token structure has all required fields (access, refresh, expired_at, refreshable_until)
 *
 * This test ensures the token refresh mechanism works correctly with valid credentials and that token rotation is properly implemented.
 */
export async function test_api_admin_token_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account via join to obtain initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {});
  // Validate initial authorization response
  typia.assert(authorizedAdmin);
  // Extract the refresh token from join response
  const refreshToken = authorizedAdmin.token.refresh;
  TestValidator.equals(
    "refresh token exists",
    refreshToken !== undefined,
    true,
  );
  TestValidator.equals(
    "refresh token is non-empty string",
    refreshToken.length > 0,
    true,
  );
  // 2. Call the refresh endpoint with valid refresh token
  const refreshedAdmin = await api.functional.ecommerceMall.auth.admin.refresh(
    adminConnection,
    {
      body: {
        refresh: refreshToken,
      } satisfies IEcommerceMallAdmin.IRefresh,
    },
  );
  // Validate refresh response
  typia.assert(refreshedAdmin);
  // 3. Verify new tokens are returned (token rotation pattern)
  TestValidator.equals(
    "new access token exists",
    refreshedAdmin.token.access !== undefined,
    true,
  );
  TestValidator.equals(
    "new refresh token exists",
    refreshedAdmin.token.refresh !== undefined,
    true,
  );
  TestValidator.equals(
    "new access token is non-empty",
    refreshedAdmin.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "new refresh token is non-empty",
    refreshedAdmin.token.refresh.length > 0,
    true,
  );
  // Verify token rotation - old and new refresh tokens should be different
  TestValidator.notEquals(
    "new refresh token differs from old",
    refreshedAdmin.token.refresh,
    refreshToken,
  );
  // 4. Verify token expiration metadata
  TestValidator.equals(
    "expired_at timestamp exists",
    refreshedAdmin.token.expired_at !== undefined,
    true,
  );
  TestValidator.equals(
    "refreshable_until timestamp exists",
    refreshedAdmin.token.refreshable_until !== undefined,
    true,
  );
  // 5. Verify admin profile data is present
  TestValidator.equals(
    "admin id exists",
    refreshedAdmin.id !== undefined,
    true,
  );
  TestValidator.equals(
    "admin email exists",
    refreshedAdmin.email !== undefined,
    true,
  );
  TestValidator.equals(
    "admin name exists",
    refreshedAdmin.name !== undefined,
    true,
  );
  TestValidator.equals(
    "created_at exists",
    refreshedAdmin.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "updated_at exists",
    refreshedAdmin.updated_at !== undefined,
    true,
  );
  TestValidator.equals("deleted_at is null", refreshedAdmin.deleted_at, null);
  // 6. Verify profile matches original join data
  TestValidator.equals(
    "admin id matches",
    refreshedAdmin.id,
    authorizedAdmin.id,
  );
  TestValidator.equals(
    "admin email matches",
    refreshedAdmin.email,
    authorizedAdmin.email,
  );
  TestValidator.equals(
    "admin name matches",
    refreshedAdmin.name,
    authorizedAdmin.name,
  );
}
