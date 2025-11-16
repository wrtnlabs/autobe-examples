import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test that token refresh operation performs proper security validation of the
 * refresh token.
 *
 * This test validates that the system verifies the refresh token's
 * cryptographic signature, checks its expiration time, and confirms it is
 * associated with an existing guest account in the discussion_board_guests
 * table. The test creates a legitimate guest account and performs token refresh
 * while monitoring that all security checks are applied.
 *
 * Test workflow:
 *
 * 1. Create a legitimate guest account to obtain authentic refresh token
 * 2. Verify successful token refresh with valid refresh token
 * 3. Test security validation by attempting refresh with invalid tokens
 * 4. Ensure only tokens passing all validation criteria result in successful
 *    refresh
 *
 * This ensures the refresh mechanism cannot be exploited with forged or invalid
 * tokens.
 */
export async function test_api_guest_token_refresh_security_validation(
  connection: api.IConnection,
) {
  // Step 1: Create legitimate guest account to obtain authentic refresh token
  const guestRegistration = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardGuest.ICreate;

  const initialGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestRegistration,
    });
  typia.assert(initialGuest);

  // Validate the initial response structure
  typia.assert<string & tags.Format<"uuid">>(initialGuest.id);
  typia.assert<IAuthorizationToken>(initialGuest.token);

  // Store the legitimate refresh token for security testing
  const validRefreshToken = initialGuest.token.refresh;

  // Step 2: Test successful token refresh with valid refresh token
  const refreshedGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: validRefreshToken,
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  typia.assert(refreshedGuest);

  // Verify the refreshed response maintains same guest ID
  TestValidator.equals(
    "refreshed guest ID should match original",
    refreshedGuest.id,
    initialGuest.id,
  );

  // Verify new tokens are provided
  typia.assert<IAuthorizationToken>(refreshedGuest.token);
  TestValidator.predicate(
    "new access token should be provided",
    refreshedGuest.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token should be provided",
    refreshedGuest.token.refresh.length > 0,
  );

  // Step 3: Test security validation - attempt refresh with empty token
  await TestValidator.error("empty refresh token should fail", async () => {
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  });

  // Step 4: Test security validation - attempt refresh with invalid JWT format
  await TestValidator.error(
    "malformed token should fail validation",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "invalid_token_string",
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );

  // Step 5: Test security validation - attempt refresh with forged token
  const forgedToken = RandomGenerator.alphaNumeric(50);
  await TestValidator.error(
    "forged token should fail cryptographic validation",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: forgedToken,
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );

  // Step 6: Test security validation - attempt refresh with modified valid token
  const modifiedToken = validRefreshToken.slice(0, -5) + "XXXXX";
  await TestValidator.error(
    "modified token should fail signature verification",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: modifiedToken,
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );

  // Step 7: Verify the original valid token still works after failed attempts
  const finalRefresh: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: validRefreshToken,
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  typia.assert(finalRefresh);

  TestValidator.equals(
    "original guest ID preserved after security tests",
    finalRefresh.id,
    initialGuest.id,
  );
}
