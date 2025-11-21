import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin refresh token with invalid tokens
 *
 * This test validates the security of the admin token refresh endpoint by
 * attempting to use various types of invalid refresh tokens. The system should
 * reject:
 *
 * 1. Completely fake/random tokens
 * 2. Malformed tokens
 * 3. Tokens with invalid formats
 * 4. Empty tokens
 *
 * The API should maintain security by not revealing specific validation
 * failures and ensuring no new tokens are issued for invalid requests.
 */
export async function test_api_admin_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Test with completely fake token
  await TestValidator.error("should reject fake refresh token", async () => {
    await api.functional.auth.admin.refresh(connection, {
      body: {
        refresh_token: RandomGenerator.alphaNumeric(64),
      } satisfies IShoppingMallAdmin.IRefresh,
    });
  });

  // Test with malformed token format
  await TestValidator.error(
    "should reject malformed refresh token",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: `invalid.${RandomGenerator.alphaNumeric(20)}.${RandomGenerator.alphaNumeric(20)}`,
        } satisfies IShoppingMallAdmin.IRefresh,
      });
    },
  );

  // Test with empty token
  await TestValidator.error("should reject empty refresh token", async () => {
    await api.functional.auth.admin.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies IShoppingMallAdmin.IRefresh,
    });
  });

  // Test with token containing invalid characters
  await TestValidator.error(
    "should reject refresh token with invalid characters",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(30) + "@#$%^&*()",
        } satisfies IShoppingMallAdmin.IRefresh,
      });
    },
  );
}
