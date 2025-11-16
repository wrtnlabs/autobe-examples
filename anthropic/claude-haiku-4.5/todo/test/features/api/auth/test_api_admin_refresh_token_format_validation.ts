import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Validates refresh token format validation on the admin refresh endpoint.
 *
 * This test verifies that the endpoint properly validates JWT token format
 * before attempting to process a refresh request. When a string that does not
 * conform to JWT token format (header.payload.signature structure) is provided
 * as the refresh_token, the system should reject it with an appropriate
 * validation or authentication error.
 *
 * Test flow:
 *
 * 1. Attempt to refresh an admin access token using an invalid/malformed refresh
 *    token
 * 2. Verify that the request fails with an authentication or validation error
 * 3. Confirm that the system properly validates JWT format before processing
 */
export async function test_api_admin_refresh_token_format_validation(
  connection: api.IConnection,
) {
  // Test 1: Invalid refresh token - simple string without JWT format
  await TestValidator.error(
    "should reject refresh token with invalid format (simple string)",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: "invalid_token_format",
        } satisfies ITodoAppAdmin.IRefresh,
      });
    },
  );

  // Test 2: Invalid refresh token - string with wrong structure
  await TestValidator.error(
    "should reject refresh token with incomplete JWT structure",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: "header.payload",
        } satisfies ITodoAppAdmin.IRefresh,
      });
    },
  );

  // Test 3: Invalid refresh token - empty string
  await TestValidator.error(
    "should reject refresh token that is empty",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies ITodoAppAdmin.IRefresh,
      });
    },
  );

  // Test 4: Invalid refresh token - random characters without JWT format
  await TestValidator.error(
    "should reject refresh token with random characters",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: "!!@#$%^&*()",
        } satisfies ITodoAppAdmin.IRefresh,
      });
    },
  );

  // Test 5: Invalid refresh token - too short token
  await TestValidator.error(
    "should reject refresh token that is too short",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: "abc",
        } satisfies ITodoAppAdmin.IRefresh,
      });
    },
  );
}
