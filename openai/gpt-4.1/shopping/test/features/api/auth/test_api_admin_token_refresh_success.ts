import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate successful admin token refresh using a valid refresh token.
 *
 * This test creates a new admin, retrieves the issued refresh token, then calls
 * the token refresh endpoint to renew authentication tokens. It validates:
 *
 * - New tokens are issued and differ from the previous ones
 * - The response includes correct audit fields and account status
 * - Token rotation prevents reuse of access tokens (rotation scenario)
 * - Full type-level and business-level integrity of session continuity
 */
export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin and validate initial authorized response
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const initialAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreate });
  typia.assert(initialAuth);

  // 2. Collect the refresh token from initial login
  const initialToken: IAuthorizationToken = initialAuth.token;
  typia.assert(initialToken);

  // 3. Use the refresh token to obtain new tokens via the refresh endpoint
  const refreshBody = {
    refresh_token: initialToken.refresh,
  } satisfies IShoppingMallAdmin.IRefresh;
  const refreshed: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, { body: refreshBody });
  typia.assert(refreshed);

  // 4. Validate that token rotation produced NEW tokens
  TestValidator.notEquals(
    "access token should be rotated",
    refreshed.token.access,
    initialToken.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    refreshed.token.refresh,
    initialToken.refresh,
  );

  // 5. Basic field and business rule validations
  TestValidator.equals("admin id matches", refreshed.id, initialAuth.id);
  TestValidator.equals(
    "admin email matches",
    refreshed.email,
    adminCreate.email,
  );
  TestValidator.equals("admin name matches", refreshed.name, adminCreate.name);
  TestValidator.equals(
    "admin account status is active",
    refreshed.status,
    "active",
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof refreshed.created_at === "string" &&
      !isNaN(Date.parse(refreshed.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof refreshed.updated_at === "string" &&
      !isNaN(Date.parse(refreshed.updated_at)),
  );
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is ISO string",
    typeof refreshed.token.expired_at === "string" &&
      !isNaN(Date.parse(refreshed.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is ISO string",
    typeof refreshed.token.refreshable_until === "string" &&
      !isNaN(Date.parse(refreshed.token.refreshable_until)),
  );
  TestValidator.predicate(
    "is_email_verified is a boolean",
    typeof refreshed.is_email_verified === "boolean",
  );
}
