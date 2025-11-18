import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test token refresh rejection with malformed or invalid refresh token.
 *
 * This test validates that the token refresh endpoint properly rejects invalid
 * or corrupted refresh tokens. It verifies that the API returns an
 * authentication error when attempting to refresh with:
 *
 * - Malformed JWT structures (missing required parts)
 * - Corrupted token signatures
 * - Invalid token payloads
 *
 * The test ensures error responses do not expose internal token validation
 * details for security purposes. It establishes baseline user data first, then
 * attempts multiple invalid token refresh scenarios.
 *
 * Steps:
 *
 * 1. Create a user account to establish valid user in the system
 * 2. Attempt refresh with various invalid token formats
 * 3. Verify endpoint rejects each invalid token with appropriate error
 * 4. Confirm error responses maintain security by not leaking details
 */
export async function test_api_user_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a user account to establish baseline
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Test refresh with malformed JWT (missing parts)
  await TestValidator.error(
    "should reject malformed JWT with missing parts",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: "invalid.token",
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // Step 3: Test refresh with corrupted token signature
  await TestValidator.error(
    "should reject token with corrupted signature",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.corrupted_signature_here",
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // Step 4: Test refresh with empty token
  await TestValidator.error("should reject empty refresh token", async () => {
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies ITodoListUser.IRefresh,
    });
  });

  // Step 5: Test refresh with random invalid token string
  await TestValidator.error(
    "should reject random invalid token string",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphabets(64),
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // Step 6: Test refresh with token-like structure but invalid content
  await TestValidator.error(
    "should reject token with invalid payload structure",
    async () => {
      const invalidToken = Buffer.from(
        JSON.stringify({ invalid: "payload" }),
      ).toString("base64");
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: `eyJhbGciOiJIUzI1NiJ9.${invalidToken}.invalidsignature`,
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );
}
