import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test the token refresh mechanism for maintaining seamless guest sessions.
 *
 * This test validates that users with a valid refresh token can obtain a new
 * access token when their current access token expires, ensuring continuous
 * authenticated sessions during extended browsing without repeatedly entering
 * credentials.
 *
 * Test workflow:
 *
 * 1. Register a new guest member account to obtain initial tokens
 * 2. Use the refresh token to request a new access token
 * 3. Verify the new token response contains valid access and refresh tokens
 * 4. Validate all session metadata is properly returned
 * 5. Test error handling with invalid refresh tokens
 */
export async function test_api_guest_token_refresh_seamless_session(
  connection: api.IConnection,
) {
  // Step 1: Register a new guest member to obtain initial tokens
  const registrationBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureP@ss123",
    ip: undefined,
    href: "https://discussion.example.com/register",
    referrer: "https://discussion.example.com/home",
  } satisfies IDiscussionBoardGuest.IRegistration;

  const initialGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: registrationBody,
    });
  typia.assert(initialGuest);

  // Step 2: Use refresh token to obtain new access token
  const refreshBody = {
    refresh_token: initialGuest.token.refresh,
  } satisfies IDiscussionBoardGuest.IRefresh;

  const refreshedGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedGuest);

  // Step 3: Validate business logic - session identity persistence
  TestValidator.equals(
    "guest ID remains the same after refresh",
    refreshedGuest.id,
    initialGuest.id,
  );
  TestValidator.equals(
    "session token remains the same after refresh",
    refreshedGuest.session_token,
    initialGuest.session_token,
  );

  // Step 4: Test error handling with invalid refresh token
  await TestValidator.error("invalid refresh token should fail", async () => {
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: "invalid_token_" + RandomGenerator.alphaNumeric(20),
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  });
}
