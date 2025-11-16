import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test token refresh failure with invalid or malformed refresh token.
 *
 * This test validates that the admin refresh endpoint properly rejects refresh
 * requests when provided with invalid, malformed, non-existent, or expired
 * refresh tokens. The system should return an error response and decline to
 * issue a new access token when the refresh token cannot be validated.
 *
 * Test flow:
 *
 * 1. Attempt to refresh with a completely invalid refresh token
 * 2. Verify that the API rejects the request with an error
 * 3. Confirm that no new access token is issued
 * 4. Attempt to refresh with an empty refresh token
 * 5. Verify rejection of malformed request
 * 6. Attempt to refresh with a malformed token string
 * 7. Verify proper error handling for corrupt tokens
 */
export async function test_api_admin_refresh_failure_invalid_refresh_token(
  connection: api.IConnection,
) {
  // Test 1: Attempt refresh with a completely invalid/non-existent refresh token
  const invalidToken: string = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should reject refresh request with non-existent refresh token",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: invalidToken,
        } satisfies ITodoAppAdmin.IRefresh,
      });
    },
  );

  // Test 2: Attempt refresh with empty/malformed refresh token
  await TestValidator.error(
    "should reject refresh request with empty refresh token",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies ITodoAppAdmin.IRefresh,
      });
    },
  );

  // Test 3: Attempt refresh with clearly malformed token (too short, invalid characters)
  await TestValidator.error(
    "should reject refresh request with malformed token string",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: "invalid_token_string_xyz",
        } satisfies ITodoAppAdmin.IRefresh,
      });
    },
  );

  // Test 4: Attempt refresh with a random string that looks like a token but isn't valid
  const randomInvalidToken: string = RandomGenerator.alphaNumeric(64);

  await TestValidator.error(
    "should reject refresh request with random invalid token",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: randomInvalidToken,
        } satisfies ITodoAppAdmin.IRefresh,
      });
    },
  );
}
