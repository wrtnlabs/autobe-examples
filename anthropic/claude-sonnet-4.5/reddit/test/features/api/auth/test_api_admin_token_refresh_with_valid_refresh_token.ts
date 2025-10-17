import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

/**
 * Test the complete administrator token refresh workflow.
 *
 * This test validates the token refresh mechanism for administrators by:
 *
 * 1. Creating a new admin account through the join endpoint
 * 2. Extracting the refresh token from the initial authentication response
 * 3. Using the refresh token to obtain a new access token
 * 4. Validating the refreshed token response structure and contents
 *
 * The test ensures that:
 *
 * - The refresh endpoint accepts valid refresh tokens
 * - A new access token is issued with updated expiration
 * - The refresh token remains unchanged after refresh
 * - Admin profile information is correctly returned
 * - The response matches IRedditLikeAdmin.IAuthorized structure
 */
export async function test_api_admin_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account to obtain initial authentication tokens
  const adminCreateData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditLikeAdmin.ICreate;

  const initialAuth: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(initialAuth);

  // Step 2: Validate initial authentication response structure
  TestValidator.predicate(
    "initial auth contains valid admin profile",
    initialAuth.id !== undefined &&
      initialAuth.username === adminCreateData.username,
  );
  TestValidator.predicate(
    "initial auth contains token information",
    initialAuth.token !== undefined &&
      initialAuth.token.access !== undefined &&
      initialAuth.token.refresh !== undefined,
  );

  // Step 3: Extract the refresh token for the refresh operation
  const refreshToken: string = initialAuth.token.refresh;

  // Step 4: Use the refresh token to obtain a new access token
  const refreshedAuth: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IRedditLikeAdmin.IRefresh,
    });
  typia.assert(refreshedAuth);

  // Step 5: Validate refreshed authentication response structure
  TestValidator.predicate(
    "refreshed auth contains admin profile",
    refreshedAuth.id !== undefined && refreshedAuth.username !== undefined,
  );
  TestValidator.predicate(
    "refreshed auth contains new access token",
    refreshedAuth.token.access !== undefined &&
      refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token remains unchanged",
    refreshedAuth.token.refresh === refreshToken,
  );

  // Step 6: Verify admin profile consistency between initial and refreshed responses
  TestValidator.equals(
    "admin ID remains consistent",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "admin username remains consistent",
    refreshedAuth.username,
    initialAuth.username,
  );
  TestValidator.equals(
    "admin email remains consistent",
    refreshedAuth.email,
    initialAuth.email,
  );

  // Step 7: Validate that the new access token is different from the original
  TestValidator.notEquals(
    "new access token differs from original",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );

  // Step 8: Verify token structure and expiration timestamps
  TestValidator.predicate(
    "refreshed token has valid expiration timestamp",
    refreshedAuth.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshed token has valid refreshable_until timestamp",
    refreshedAuth.token.refreshable_until !== undefined,
  );
}
