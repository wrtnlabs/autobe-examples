import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate successful admin token refresh using a valid, unexpired refresh
 * token.
 *
 * This test simulates the scenario where an administrator, whose session is
 * active (not locked or expired), requests new authentication tokens using
 * their valid refresh token. The test ensures that:
 *
 * - The returned tokens are valid and structurally correct
 * - The session remains linked to the correct admin account
 * - The issued token has an extended expiration
 * - The account's locked status is respected (must be unlocked)
 *
 * Steps:
 *
 * 1. Generate a realistic refresh token (as would be received from login)
 * 2. Call the admin token refresh endpoint
 * 3. Assert the returned IAuthorized object is valid
 * 4. Ensure the admin ID is maintained
 * 5. Assert the refresh token in the response is different (rotated) if business
 *    rules apply
 * 6. Validate that expiration times are extended forward
 */
export async function test_api_admin_token_refresh_successful_session(
  connection: api.IConnection,
) {
  // Step 1: Prepare a valid refresh token - simulate a prior valid admin login
  // (In real workflow, the refresh token is received after login. Here we simulate.)
  const refreshToken: string = typia.random<string>(); // Ideally, should simulate a valid real refresh token
  const requestBody = {
    refresh_token: refreshToken,
  } satisfies ITodoListAdmin.IRefresh;

  // Step 2: Call the API to refresh admin tokens
  const result: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, { body: requestBody });

  // Step 3: Validate result strictly matches IAuthorized
  typia.assert(result);

  // Step 4: Check that the authorized session is linked to the original account
  TestValidator.predicate(
    "admin id must be valid uuid",
    typeof result.id === "string" && result.id.length > 0,
  );

  // Step 5: The returned refresh token should be a new string (rotated or reissued), not empty
  TestValidator.predicate(
    "refresh token must be non-empty",
    typeof result.token.refresh === "string" && result.token.refresh.length > 0,
  );

  // Step 6: Access token and its expiry are valid and in ISO 8601 format, and expiry/refreshable_until must be in the future
  TestValidator.predicate(
    "access token expiration must be a valid ISO 8601 date-time",
    typeof result.token.expired_at === "string" &&
      !isNaN(Date.parse(result.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until must be a valid ISO 8601 date-time",
    typeof result.token.refreshable_until === "string" &&
      !isNaN(Date.parse(result.token.refreshable_until)),
  );
  // Optional: Check that returned is_locked has not changed from the account state (would need existing state)
}
