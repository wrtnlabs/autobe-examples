import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test guest token refresh failure when the refresh token has expired beyond
 * the 7-day lifetime.
 *
 * This test validates proper error handling for expired refresh tokens in the
 * guest authentication flow. The workflow ensures that expired credentials
 * cannot be used to obtain new access tokens, maintaining system security.
 *
 * Test workflow:
 *
 * 1. Create a guest session to obtain initial tokens
 * 2. Verify the guest session was created successfully
 * 3. Attempt to refresh using an invalid/expired refresh token
 * 4. Verify that the refresh request fails with appropriate error
 * 5. Confirm the system rejects expired credentials
 */
export async function test_api_guest_token_refresh_with_expired_refresh_token(
  connection: api.IConnection,
) {
  const guestData = {
    email: typia.random<string & tags.Format<"email">>(),
    session_metadata: {
      ip_address: "192.168.1.100",
      user_agent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  } satisfies IDiscussionBoardGuest.ICreate;

  const guestSession: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestData,
    });
  typia.assert(guestSession);

  TestValidator.predicate(
    "guest session created with valid ID",
    guestSession.id.length > 0,
  );
  TestValidator.predicate(
    "access token exists",
    guestSession.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    guestSession.token.refresh.length > 0,
  );

  const expiredRefreshToken =
    "expired_or_invalid_token_" + typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "refresh with expired token should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );
}
