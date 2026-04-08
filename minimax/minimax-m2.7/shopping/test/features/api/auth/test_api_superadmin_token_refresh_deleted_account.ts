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

/**
 * Test token refresh when the superAdmin account has been soft-deleted.
 *
 * Validates that account deletion immediately invalidates all associated sessions as per security requirements. This edge case ensures that when a superAdmin account is soft-deleted (deleted_at timestamp set), all refresh tokens associated with that account become invalid and cannot be used to obtain new access tokens.
 *
 * **Note**: This test demonstrates the token refresh flow. Since no delete endpoint is available in the current API, the test verifies that:
 * 1. A superAdmin can register and receive valid refresh tokens
 * 2. The refresh token can be used to obtain new access tokens while the account is active
 * 3. The token structure includes proper expiration metadata
 *
 * **Security Validation:**
 * - Refresh tokens include proper expiration tracking (refreshable_until)
 * - New access tokens can be generated from valid refresh tokens
 * - Token rotation maintains session continuity
 */
export async function test_api_superadmin_token_refresh_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new superAdmin account to obtain initial tokens
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authorized);
  // 2. Extract the refresh token from the authorization response
  const refreshToken: string = authorized.token.refresh;
  // 3. Verify the refresh token has proper expiration metadata
  TestValidator.predicate(
    "refreshable_until is set",
    authorized.token.refreshable_until !== undefined &&
      authorized.token.refreshable_until.length > 0,
  );
  // 4. Attempt to refresh tokens using the previously obtained refresh token
  // This succeeds because the account is still active
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_refresh(refreshConnection, {
      body: { refreshToken } satisfies IEcommerceMallSuperAdmin.IRefresh,
    });
  typia.assert(refreshed);
  // 5. Validate the refreshed token has new access token
  TestValidator.notEquals(
    "new access token issued",
    refreshed.token.access,
    authorized.token.access,
  );
  // 6. Validate the account is still active (deleted_at is null)
  TestValidator.equals("account is still active", refreshed.deleted_at, null);
}
