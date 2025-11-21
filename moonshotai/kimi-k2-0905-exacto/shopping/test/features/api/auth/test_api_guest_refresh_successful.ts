import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

/**
 * Test successful guest session refresh with valid session ID.
 *
 * This test validates the guest authentication refresh functionality within the
 * shopping mall platform. The scenario establishes a complete guest
 * authentication flow:
 *
 * 1. Create a new guest session with realistic browsing context
 * 2. Validate the initial guest authentication response
 * 3. Refresh the guest session to obtain updated tokens
 * 4. Verify session continuity and token updates
 * 5. Validate that browsing capabilities persist across token refresh
 *
 * The test ensures that anonymous users can maintain their shopping experience
 * without interruption while preserving session security and token lifecycle
 * management. This is essential for e-commerce platforms where guest users need
 * seamless access to product browsing, cart management, and basic platform
 * features.
 */
export async function test_api_guest_refresh_successful(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session with realistic browsing context
  const currentTime = new Date().toISOString();
  const sessionId = RandomGenerator.alphaNumeric(32);

  const guestCreateRequest = {
    href: "https://shopping-mall.example.com/products/electronics",
    referrer: "https://search-engine.example.com/search?q=smartphones",
    session_id: sessionId,
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    last_activity_at: currentTime,
    created_at: currentTime,
    updated_at: currentTime,
  } satisfies IShoppingMallGuest.ICreate;

  // Establish guest authentication
  const initialGuestAuth = await api.functional.auth.guest.join(connection, {
    body: guestCreateRequest,
  });
  typia.assert(initialGuestAuth);

  // Step 2: Validate initial guest authentication response
  TestValidator.predicate(
    "initial guest auth has valid UUID",
    initialGuestAuth.id.length > 0,
  );
  TestValidator.equals(
    "session ID matches request",
    initialGuestAuth.session_id,
    sessionId,
  );

  // Validate token structure
  typia.assert<IAuthorizationToken>(initialGuestAuth.token);

  // Step 3: Refresh the guest session to obtain updated tokens
  const refreshRequest = {
    session_id: sessionId,
  } satisfies IShoppingMallGuest.IRefresh;

  const refreshedGuestAuth = await api.functional.auth.guest.refresh(
    connection,
    { body: refreshRequest },
  );
  typia.assert(refreshedGuestAuth);

  // Step 4: Verify session continuity and token updates
  TestValidator.equals(
    "session ID remains constant after refresh",
    refreshedGuestAuth.session_id,
    sessionId,
  );
  TestValidator.equals(
    "guest ID remains constant after refresh",
    refreshedGuestAuth.id,
    initialGuestAuth.id,
  );

  // Validate new token is different from original
  TestValidator.notEquals(
    "access token is updated after refresh",
    refreshedGuestAuth.token.access,
    initialGuestAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token is updated after refresh",
    refreshedGuestAuth.token.refresh,
    initialGuestAuth.token.refresh,
  );

  // Step 5: Validate that browsing capabilities persist across token refresh
  TestValidator.predicate(
    "new token has valid expiration date",
    new Date(refreshedGuestAuth.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "new token has valid refreshable period",
    new Date(refreshedGuestAuth.token.refreshable_until) > new Date(),
  );

  // Verify IP address and user agent consistency
  TestValidator.equals(
    "IP address remains consistent",
    refreshedGuestAuth.ip_address,
    initialGuestAuth.ip_address,
  );
  TestValidator.equals(
    "user agent remains consistent",
    refreshedGuestAuth.user_agent,
    initialGuestAuth.user_agent,
  );
}
