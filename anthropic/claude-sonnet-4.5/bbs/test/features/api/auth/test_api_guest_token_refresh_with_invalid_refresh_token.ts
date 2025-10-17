import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test guest token refresh failure when invalid or malformed refresh tokens are
 * provided.
 *
 * This test validates that the API properly rejects token refresh attempts with
 * invalid tokens and enforces security measures against token manipulation.
 *
 * Test workflow:
 *
 * 1. Create a legitimate guest session to establish authentication context
 * 2. Attempt refresh with completely invalid token string
 * 3. Attempt refresh with malformed JWT structure
 * 4. Attempt refresh with valid JWT format but invalid signature
 * 5. Verify all invalid attempts are rejected appropriately
 *
 * Expected outcomes:
 *
 * - All invalid refresh attempts are rejected
 * - Authentication errors returned for invalid tokens
 * - Security validation prevents token manipulation
 */
export async function test_api_guest_token_refresh_with_invalid_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Create a legitimate guest session for context
  const guestSession = await api.functional.auth.guest.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      session_metadata: {
        ip_address: "192.168.1.100",
        user_agent: "Mozilla/5.0 (Test Browser)",
      },
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(guestSession);

  // Step 2: Attempt refresh with completely invalid token string
  await TestValidator.error(
    "completely invalid token string should be rejected",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "this-is-completely-invalid-gibberish-token-12345",
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );

  // Step 3: Attempt refresh with malformed JWT structure (missing signature part)
  await TestValidator.error(
    "malformed JWT structure should be rejected",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0",
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );

  // Step 4: Attempt refresh with valid JWT format but invalid signature
  await TestValidator.error(
    "valid JWT format with invalid signature should be rejected",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalidSignatureHereXYZ123456789",
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );

  // Step 5: Attempt refresh with empty refresh token
  await TestValidator.error(
    "empty refresh token should be rejected",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );
}
