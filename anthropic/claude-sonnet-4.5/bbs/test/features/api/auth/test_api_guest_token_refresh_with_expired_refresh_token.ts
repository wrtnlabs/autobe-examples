import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test token refresh rejection when using an invalid refresh token.
 *
 * This test validates that the guest token refresh operation correctly rejects
 * invalid or fake refresh tokens, ensuring proper authentication security and
 * preventing unauthorized token generation. Since testing actual token
 * expiration is impractical in E2E tests (would require waiting for real time
 * to pass), this test validates the token validation logic by attempting
 * refresh with a completely invalid token that the server will reject.
 *
 * Test Flow:
 *
 * 1. Create initial guest session to establish valid authentication context
 * 2. Attempt to refresh using an invalid/fake refresh token
 * 3. Verify refresh operation fails with authentication error
 * 4. Ensure no new tokens are issued for invalid credentials
 */
export async function test_api_guest_token_refresh_with_expired_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session to establish context
  const sessionIdentifier = typia.random<string & tags.Format<"uuid">>();
  const userAgent = RandomGenerator.alphaNumeric(50);

  const guestCreateData = {
    session_identifier: sessionIdentifier,
    ip_address: "192.168.1.100",
    user_agent: userAgent,
  } satisfies IDiscussionBoardGuest.ICreate;

  const initialGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestCreateData,
    });

  typia.assert(initialGuest);

  // Step 2: Validate initial guest session was created successfully
  TestValidator.equals(
    "session identifier matches",
    initialGuest.session_identifier,
    sessionIdentifier,
  );
  TestValidator.equals(
    "user agent matches",
    initialGuest.user_agent,
    userAgent,
  );

  // Step 3: Attempt to refresh with an invalid/fake refresh token
  // This simulates what would happen with an expired, revoked, or forged token
  const invalidRefreshToken =
    "invalid.fake.token." + RandomGenerator.alphaNumeric(100);

  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );
}
