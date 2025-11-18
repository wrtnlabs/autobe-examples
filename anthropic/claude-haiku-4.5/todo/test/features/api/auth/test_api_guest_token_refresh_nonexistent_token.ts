import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

/**
 * Test guest token refresh with a non-existent token.
 *
 * This test validates that the guest token refresh endpoint properly rejects
 * refresh tokens that are syntactically valid JWT format but do not exist in
 * the system (were never issued). The test ensures the system safely handles
 * unknown tokens by returning an authentication error rather than generating
 * new tokens.
 *
 * The test flow:
 *
 * 1. Generate a valid JWT format refresh token that was never issued
 * 2. Attempt to refresh using this non-existent token
 * 3. Verify that the request fails with an authentication error
 * 4. Confirm that no valid tokens are returned
 */
export async function test_api_guest_token_refresh_nonexistent_token(
  connection: api.IConnection,
) {
  // Generate a fake JWT refresh token that is syntactically valid but never issued
  // JWT format: header.payload.signature
  const fakeRefreshToken = typia.random<string & tags.Format<"uuid">>();
  const nonexistentToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.${fakeRefreshToken}`;

  // Attempt to refresh with a non-existent token and verify it fails
  await TestValidator.error(
    "refresh with non-existent token should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: nonexistentToken,
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );
}
