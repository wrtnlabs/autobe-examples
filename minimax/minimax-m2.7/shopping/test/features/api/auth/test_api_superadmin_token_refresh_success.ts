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
 * Test successful token refresh for superAdmin.
 *
 * Validates the complete token refresh flow for super administrator authentication.
 * This test verifies that a superAdmin can successfully extend their session by
 * exchanging a valid refresh token for new access and refresh tokens.
 *
 * The test flow includes:
 * 1. Register a new superAdmin account with email and password credentials
 * 2. Verify initial response contains valid access_token and refresh_token
 * 3. Create a new connection and call refresh endpoint with the refresh_token
 * 4. Verify new tokens are issued with updated expiration timestamps
 * 5. Validate superAdmin identity (id, email) remains consistent
 *
 * This ensures session maintenance works correctly for platform administrators.
 */
export async function test_api_superadmin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new superAdmin account using utility function
  const initialAuth: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(connection, {});
  // Validate initial authorization response structure
  typia.assert(initialAuth);
  TestValidator.equals(
    "has valid id",
    typeof initialAuth.id === "string" && initialAuth.id.length > 0,
    true,
  );
  TestValidator.equals(
    "has valid email",
    typeof initialAuth.email === "string" && initialAuth.email.includes("@"),
    true,
  );
  TestValidator.equals(
    "has valid token",
    initialAuth.token !== undefined,
    true,
  );
  TestValidator.equals(
    "has access token",
    typeof initialAuth.token.access === "string" &&
      initialAuth.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "has refresh token",
    typeof initialAuth.token.refresh === "string" &&
      initialAuth.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "has expiration timestamp",
    typeof initialAuth.token.expired_at === "string",
    true,
  );
  TestValidator.equals(
    "has refreshable_until timestamp",
    typeof initialAuth.token.refreshable_until === "string",
    true,
  );
  // Store initial tokens and identity for comparison
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  const initialExpiredAt = initialAuth.token.expired_at;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  const initialId = initialAuth.id;
  const initialEmail = initialAuth.email;
  // 2. Call refresh endpoint with the received refresh_token
  // Create a new connection for the refresh request
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_refresh(refreshConnection, {
      body: {
        refreshToken: initialRefreshToken,
      } satisfies IEcommerceMallSuperAdmin.IRefresh,
    });
  // Validate refreshed authorization response
  typia.assert(refreshedAuth);
  // 3. Verify new tokens are different from initial tokens
  TestValidator.notEquals(
    "new access token differs",
    refreshedAuth.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  // 4. Verify expiration timestamps are updated (later than initial)
  const refreshedExpiredAtDate = new Date(refreshedAuth.token.expired_at);
  const initialExpiredAtDate = new Date(initialExpiredAt);
  TestValidator.predicate(
    "new expiration is later than original",
    refreshedExpiredAtDate > initialExpiredAtDate,
  );
  const refreshedRefreshableUntilDate = new Date(
    refreshedAuth.token.refreshable_until,
  );
  const initialRefreshableUntilDate = new Date(initialRefreshableUntil);
  TestValidator.predicate(
    "new refreshable_until is later than original",
    refreshedRefreshableUntilDate > initialRefreshableUntilDate,
  );
  // 5. Verify superAdmin identity remains consistent
  TestValidator.equals("id remains consistent", refreshedAuth.id, initialId);
  TestValidator.equals(
    "email remains consistent",
    refreshedAuth.email,
    initialEmail,
  );
  TestValidator.equals(
    "created_at unchanged",
    refreshedAuth.created_at,
    initialAuth.created_at,
  );
  TestValidator.equals(
    "deleted_at remains null",
    refreshedAuth.deleted_at,
    null,
  );
}
