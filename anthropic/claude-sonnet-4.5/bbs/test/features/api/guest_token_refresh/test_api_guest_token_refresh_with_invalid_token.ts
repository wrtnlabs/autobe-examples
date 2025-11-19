import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test token refresh rejection when using an invalid or malformed refresh
 * token.
 *
 * This test validates that the guest token refresh endpoint properly rejects
 * invalid refresh tokens and prevents unauthorized token generation. The test
 * creates a valid guest session first to establish authentication context, then
 * attempts to refresh tokens using various types of invalid tokens including
 * completely random strings, malformed JWT tokens, and tampered token values.
 *
 * The test ensures that:
 *
 * 1. Invalid refresh tokens are rejected with authentication errors
 * 2. No new tokens are issued during failed refresh attempts
 * 3. The original guest session remains unaffected by invalid refresh attempts
 * 4. Multiple types of invalid tokens (random strings, malformed JWTs, empty
 *    strings) are all properly rejected
 *
 * This validates proper token validation and prevents security vulnerabilities
 * where malicious actors could generate unauthorized tokens through invalid
 * refresh attempts.
 */
export async function test_api_guest_token_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a valid guest session to establish baseline context
  const validGuestSession = await api.functional.auth.guest.join(connection, {
    body: {
      session_identifier: typia.random<string & tags.Format<"uuid">>(),
      user_agent: RandomGenerator.alphaNumeric(50),
      ip_address: "192.168.1.100",
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(validGuestSession);

  // Step 2: Attempt token refresh with completely random string (no JWT structure)
  await TestValidator.error(
    "refresh with random string should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(100),
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );

  // Step 3: Attempt token refresh with malformed JWT-like string
  await TestValidator.error(
    "refresh with malformed JWT should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: `${RandomGenerator.alphaNumeric(20)}.${RandomGenerator.alphaNumeric(20)}.${RandomGenerator.alphaNumeric(20)}`,
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );

  // Step 4: Attempt token refresh with empty string
  await TestValidator.error(
    "refresh with empty token should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );

  // Step 5: Attempt token refresh with invalid characters
  await TestValidator.error(
    "refresh with invalid characters should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "!!!invalid@token#with$special%chars&&&",
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );

  // Step 6: Attempt token refresh with tampered valid token (modify last character)
  await TestValidator.error(
    "refresh with tampered token should fail",
    async () => {
      const tamperedToken =
        validGuestSession.token.refresh.slice(0, -1) +
        (validGuestSession.token.refresh.slice(-1) === "a" ? "b" : "a");
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: tamperedToken,
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );

  // Step 7: Verify the original valid session still works after invalid refresh attempts
  // This confirms that failed refresh attempts don't corrupt or invalidate the original session
  const refreshedValidSession = await api.functional.auth.guest.refresh(
    connection,
    {
      body: {
        refresh_token: validGuestSession.token.refresh,
      } satisfies IDiscussionBoardGuest.IRefresh,
    },
  );
  typia.assert(refreshedValidSession);

  // Validate that the refreshed session belongs to the same guest
  TestValidator.equals(
    "refreshed session should belong to same guest",
    refreshedValidSession.id,
    validGuestSession.id,
  );
}
