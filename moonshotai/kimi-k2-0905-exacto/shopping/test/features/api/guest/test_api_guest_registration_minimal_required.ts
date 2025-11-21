import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

/**
 * Test guest registration with minimal required fields to validate minimum data
 * requirements.
 *
 * This test verifies successful session creation when only href, referrer,
 * session_id, user_agent, and timestamp fields are provided, with optional IP
 * address omitted.
 *
 * The test ensures the system handles minimal guest data appropriately while
 * maintaining security and session functionality. Tests that required timestamp
 * fields (created_at, updated_at, last_activity_at) are properly handled.
 *
 * Business Context:
 *
 * - Enables anonymous browsing without personal information collection
 * - Facilitates temporary shopping cart functionality
 * - Provides session continuity across page visits
 * - Maintains privacy compliance by not requiring IP address submission
 */
export async function test_api_guest_registration_minimal_required(
  connection: api.IConnection,
) {
  // Generate minimal required data without optional IP address
  const currentTime = new Date().toISOString();
  const guestSession = {
    // Required connection tracking fields for navigation analysis
    href: `https://shopping-mall.example.com/product/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://search-engine.com/search?q=${RandomGenerator.name().replace(" ", "+")}`,

    // Anonymous session identifier for unique guest tracking
    session_id: RandomGenerator.alphaNumeric(32), // Meets MinLength<10> & MaxLength<64> requirements

    // Browser user agent for device compatibility and analytics
    user_agent: RandomGenerator.pick([
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    ] as const),

    // Required timestamp fields for session lifecycle management
    created_at: currentTime,
    updated_at: currentTime,
    last_activity_at: currentTime,

    // IP address is explicitly omitted - testing minimal required data per scenario requirements
  } satisfies IShoppingMallGuest.ICreate;

  // Register the guest with minimal required data
  const guest = await api.functional.auth.guest.join(connection, {
    body: guestSession,
  });
  typia.assert(guest);

  // Validate UUID generation for guest identification
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  TestValidator.predicate("guest id is valid uuid", uuidRegex.test(guest.id));

  // Validate session continuity
  TestValidator.equals(
    "guest session id matches request",
    guest.session_id,
    guestSession.session_id,
  );
  TestValidator.equals(
    "guest user agent matches request",
    guest.user_agent,
    guestSession.user_agent,
  );
  TestValidator.predicate(
    "guest has authorization token",
    guest.token.access.length > 0,
  );

  // Validate session management timestamps
  TestValidator.equals(
    "last activity timestamp matches",
    guest.last_activity_at,
    currentTime,
  );
  TestValidator.predicate(
    "IP address field is populated even when not provided in request",
    guest.ip_address.length > 0,
  );

  // Validate JWT token structure for API authentication
  TestValidator.predicate(
    "access token has sufficient length",
    guest.token.access.length > 20,
  );
  TestValidator.predicate(
    "refresh token has sufficient length",
    guest.token.refresh.length > 20,
  );
  TestValidator.predicate(
    "token has expiration time",
    new Date(guest.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "token refreshable until extends future",
    new Date(guest.token.refreshable_until) > new Date(),
  );
}
