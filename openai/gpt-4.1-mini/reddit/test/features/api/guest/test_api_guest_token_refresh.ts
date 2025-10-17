import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test refreshing of JWT access tokens for guests.
 *
 * This test shall perform the following steps:
 *
 * 1. Create a new guest session with join operation, providing session id, IP
 *    address and optional user agent.
 * 2. Validate the guest authorized response with tokens.
 * 3. Use the refresh token from the initial response to invoke the refresh
 *    operation.
 * 4. Validate the refreshed guest authorized response.
 * 5. Ensure that refreshed tokens have valid updated expiration timestamps
 *    different from previous ones.
 * 6. Confirm the session continuity by matching guest id and session_id.
 */
export async function test_api_guest_token_refresh(
  connection: api.IConnection,
) {
  // Step 1: Prepare guest creation request data
  const sessionId = RandomGenerator.alphaNumeric(24);
  const ipAddress = "192.168.1.1";
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";

  const createBody = {
    session_id: sessionId,
    ip_address: ipAddress,
    user_agent: userAgent,
  } satisfies IRedditCommunityGuest.ICreate;

  // Step 2: Call joinGuest to create guest session
  const guest: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.join.joinGuest(connection, {
      body: createBody,
    });
  typia.assert(guest);

  // Step 3: Refresh using the refresh token from the guest
  const refreshBody = {
    refresh_token: guest.token.refresh,
  } satisfies IRedditCommunityGuest.IRefresh;

  const refreshedGuest: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.refresh.refreshGuest(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedGuest);

  // Step 4: Validate session continuity
  TestValidator.equals("guest id continuity", refreshedGuest.id, guest.id);
  TestValidator.equals(
    "guest session_id continuity",
    refreshedGuest.session_id,
    guest.session_id,
  );

  // Step 5: Validate token updates
  TestValidator.predicate(
    "refresh token is unchanged",
    refreshedGuest.token.refresh === guest.token.refresh,
  );

  TestValidator.predicate(
    "access token is updated",
    refreshedGuest.token.access !== guest.token.access,
  );

  TestValidator.predicate(
    "expired_at is updated and later",
    new Date(refreshedGuest.token.expired_at).getTime() >
      new Date(guest.token.expired_at).getTime(),
  );

  TestValidator.predicate(
    "refreshable_until is updated and later",
    new Date(refreshedGuest.token.refreshable_until).getTime() >
      new Date(guest.token.refreshable_until).getTime(),
  );
}
