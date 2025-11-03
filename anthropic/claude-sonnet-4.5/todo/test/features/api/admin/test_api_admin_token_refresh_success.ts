import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test successful admin access token refresh workflow.
 *
 * This test validates the complete token refresh mechanism for administrators.
 * It first creates a new admin account to obtain initial JWT tokens, then uses
 * the refresh token to obtain a new access token without re-authentication.
 *
 * Steps:
 *
 * 1. Create a new admin account using join operation
 * 2. Obtain initial access and refresh tokens from join response
 * 3. Use the refresh token to request a new access token
 * 4. Validate the new access token and verify admin information
 * 5. Confirm token expiration timestamps are properly set
 */
export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account and obtain initial tokens
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const joinResult = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(joinResult);

  // Step 2: Verify initial join response contains valid tokens
  TestValidator.predicate(
    "join response should have valid access token",
    joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "join response should have valid refresh token",
    joinResult.token.refresh.length > 0,
  );

  // Step 3: Use the refresh token to obtain a new access token
  const refreshResult = await api.functional.auth.admin.refresh(connection, {
    body: {
      refreshToken: joinResult.token.refresh,
    } satisfies ITodoListAdmin.IRefresh,
  });
  typia.assert(refreshResult);

  // Step 4: Validate the refresh response contains admin information
  TestValidator.equals(
    "refreshed admin id matches original",
    refreshResult.id,
    joinResult.id,
  );
  TestValidator.equals(
    "refreshed admin email matches original",
    refreshResult.email,
    joinResult.email,
  );

  // Step 5: Verify new access token is different from original
  TestValidator.notEquals(
    "new access token should be different from original",
    refreshResult.token.access,
    joinResult.token.access,
  );

  // Step 6: Validate token expiration timestamps are set
  TestValidator.predicate(
    "new access token should have expiration timestamp",
    refreshResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token should have refreshable_until timestamp",
    refreshResult.token.refreshable_until.length > 0,
  );

  // Step 7: Verify the new access token is valid and usable
  TestValidator.predicate(
    "new access token should be a valid non-empty string",
    refreshResult.token.access.length > 0,
  );
}
