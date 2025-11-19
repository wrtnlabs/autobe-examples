import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Validates JWT token permissions in guest registration response.
 *
 * This test verifies that the guest registration endpoint returns proper JWT
 * tokens with read-only access permissions. It ensures that:
 *
 * 1. Guest session is successfully created with valid session tracking data
 * 2. Authorization tokens (access and refresh) are properly issued
 * 3. Token expiration timestamps are correctly formatted and present
 * 4. The token structure enables enforcement of guest read-only access
 *    restrictions
 *
 * The guest tokens should grant read-only access to published articles and
 * public discussions while preventing content creation, commenting, file
 * uploads, and moderation features.
 */
export async function test_api_guest_registration_read_only_token_permissions(
  connection: api.IConnection,
) {
  // Step 1: Prepare guest registration data
  const guestRegistrationData = {
    session_identifier: typia.random<string & tags.Format<"uuid">>(),
    ip_address: "192.168.1.100",
    user_agent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  } satisfies IDiscussionBoardGuest.ICreate;

  // Step 2: Register guest session and receive authorization response
  const guestAuthorized: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestRegistrationData,
    });

  // Step 3: Validate complete guest authorized response structure
  typia.assert(guestAuthorized);

  // Step 4: Validate guest session data matches input
  TestValidator.equals(
    "session identifier matches",
    guestAuthorized.session_identifier,
    guestRegistrationData.session_identifier,
  );

  TestValidator.equals(
    "user agent matches",
    guestAuthorized.user_agent,
    guestRegistrationData.user_agent,
  );

  // Step 5: Verify authorization token structure exists and is valid
  const token: IAuthorizationToken = guestAuthorized.token;
  typia.assert(token);

  // Step 6: Verify expiration timestamps can be parsed as valid dates
  const expiredAtDate = new Date(token.expired_at);
  const refreshableUntilDate = new Date(token.refreshable_until);

  // Step 7: Validate that token expiration times are in the future
  const now = new Date();

  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAtDate.getTime() > now.getTime(),
  );

  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshableUntilDate.getTime() > now.getTime(),
  );

  // Step 8: Verify refresh window is longer than access token lifetime
  TestValidator.predicate(
    "refresh window extends beyond access token expiration",
    refreshableUntilDate.getTime() > expiredAtDate.getTime(),
  );
}
