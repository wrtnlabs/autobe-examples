import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";

/**
 * Test administrator token refresh with expired refresh token.
 *
 * This scenario validates the system's handling of expired refresh tokens by
 * attempting to refresh a session using an invalid or expired token. Verify
 * that the system properly rejects the request and returns appropriate error
 * responses, ensuring security by preventing unauthorized session extension.
 */
export async function test_api_admin_refresh_token_expired(
  connection: api.IConnection,
) {
  // Generate a random refresh token that simulates an expired token
  const expiredRefreshToken = RandomGenerator.alphaNumeric(64);

  // Create refresh request with proper URI and referrer values
  const refreshRequest = {
    refresh_token: expiredRefreshToken,
    href: "https://admin.example.com/auth/refresh" satisfies string as string &
      tags.Format<"uri">,
    referrer: "https://admin.example.com/dashboard" satisfies string as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdministrator.IRefresh;

  // Attempt to refresh with expired token and validate it fails
  await TestValidator.error(
    "refresh should fail with expired token",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: refreshRequest,
      });
    },
  );
}
