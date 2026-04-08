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

/**
 * Test super administrator token refresh success workflow.
 *
 * Validates the complete token refresh flow for super administrators including initial account creation, authentication, and token refresh. Ensures that the refresh operation returns new valid tokens with proper expiration timestamps and maintains account information integrity.
 *
 * Special attention is given to verifying that both access and refresh tokens are rotated (different from original tokens) and that expiration timestamps remain in the future, confirming the session extension is working correctly.
 *
 * 1. Create super administrator account with randomized credentials and obtain initial authentication tokens.
 * 2. Capture initial access and refresh tokens for comparison.
 * 3. Use the initial refresh token to request a new token pair via the refresh endpoint.
 * 4. Validate new tokens differ from originals (token rotation) and have valid future expiration timestamps.
 * 5. Verify account information (id, email, timestamps) is consistent across both responses and deleted_at is null.
 */
export async function test_api_super_admin_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account and obtain initial tokens
  const superAdminConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(initialAuth);
  // 2. Capture initial tokens for comparison
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  // 3. Refresh tokens using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_super_admin_refresh(refreshConnection, {
    body: {
      refreshToken: initialRefreshToken,
    } satisfies IShoppingMallSuperAdmin.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 4. Validate new tokens are different from originals (token rotation)
  TestValidator.notEquals(
    "access token rotated",
    initialAccessToken,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    initialRefreshToken,
    refreshedAuth.token.refresh,
  );
  // 5. Validate expiration timestamps are in the future
  const now = new Date().toISOString();
  TestValidator.predicate(
    "expired_at is in future",
    refreshedAuth.token.expired_at > now,
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshedAuth.token.refreshable_until > now,
  );
  // 6. Validate account information consistency
  TestValidator.equals("account id matches", initialAuth.id, refreshedAuth.id);
  TestValidator.equals("email matches", initialAuth.email, refreshedAuth.email);
  TestValidator.equals(
    "created_at matches",
    initialAuth.created_at,
    refreshedAuth.created_at,
  );
  TestValidator.predicate(
    "updated_at is valid",
    refreshedAuth.updated_at >= initialAuth.updated_at,
  );
  TestValidator.equals("deleted_at is null", refreshedAuth.deleted_at, null);
}
