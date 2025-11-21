import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function test_api_guest_refresh_extended_activity(
  connection: api.IConnection,
) {
  // Simulate extended guest browsing session starting 30 minutes ago
  const sessionStartTime = new Date(Date.now() - 1000 * 60 * 30); // 30 minutes ago

  // Create initial guest session with realistic browsing metadata
  const initialGuestData = {
    session_id: RandomGenerator.alphaNumeric(24),
    ip: "192.168.1.100" satisfies string & tags.Format<"ipv4">,
    href: "https://shopping-mall.example.com/products/electronics",
    referrer: "https://google.com/search",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    last_activity_at: sessionStartTime.toISOString(),
    created_at: sessionStartTime.toISOString(),
    updated_at: sessionStartTime.toISOString(),
  } satisfies IShoppingMallGuest.ICreate;

  // Join as guest user to establish session
  const guestSession = await api.functional.auth.guest.join(connection, {
    body: initialGuestData,
  });
  typia.assert(guestSession);

  // Simulate realistic extended browsing patterns
  // 1. Initial product search and browsing
  const searchTimestamp = new Date(Date.now() - 1000 * 60 * 20).toISOString();

  // 2. Product page views with navigation
  const productViews = [
    "https://shopping-mall.example.com/products/smartphones/iphone-15",
    "https://shopping-mall.example.com/products/laptops/macbook-pro-14",
    "https://shopping-mall.example.com/products/tablets/ipad-air",
  ];

  // 3. Cart interactions
  const cartTimestamp = new Date(Date.now() - 1000 * 60 * 10).toISOString();

  // 4. Checkout process simulation
  const checkoutTimestamp = new Date(Date.now() - 1000 * 60 * 5).toISOString();

  // Perform initial refresh to simulate mid-session activity
  const midSessionRefreshData = {
    session_id: guestSession.session_id,
  } satisfies IShoppingMallGuest.IRefresh;

  const midSessionResult = await api.functional.auth.guest.refresh(connection, {
    body: midSessionRefreshData,
  });
  typia.assert(midSessionResult);

  TestValidator.equals(
    "mid-session refresh preserves guest session ID",
    midSessionResult.id,
    guestSession.id,
  );

  TestValidator.equals(
    "session_id remains consistent during active browsing",
    midSessionResult.session_id,
    guestSession.session_id,
  );

  TestValidator.notEquals(
    "mid-session refresh updates access token",
    midSessionResult.token.access,
    guestSession.token.access,
  );

  // Wait to simulate extended activity period before final refresh
  const extendedWaitTime = 2 * 60 * 1000; // 2 minutes delay to test refresh after extended activity
  await new Promise((resolve) => setTimeout(resolve, extendedWaitTime));

  // Perform final refresh after extended browsing activity
  const finalRefreshData = {
    session_id: guestSession.session_id,
  } satisfies IShoppingMallGuest.IRefresh;

  const finalSession = await api.functional.auth.guest.refresh(connection, {
    body: finalRefreshData,
  });
  typia.assert(finalSession);

  // Validate extended guest session integrity and continuity
  TestValidator.equals(
    "extended activity session maintains guest ID consistency",
    finalSession.id,
    guestSession.id,
  );

  TestValidator.equals(
    "session continuity preserved after extended browsing",
    finalSession.session_id,
    guestSession.session_id,
  );

  TestValidator.equals(
    "IP address integrity maintained through extended activity",
    finalSession.ip_address,
    guestSession.ip_address,
  );

  TestValidator.equals(
    "user agent consistency during extended session",
    finalSession.user_agent,
    guestSession.user_agent,
  );

  // Verify token refresh functionality after extended activity
  TestValidator.predicate(
    "token expiration extended after extended activity refresh",
    () =>
      new Date(finalSession.token.expired_at) >
      new Date(guestSession.token.expired_at),
  );

  TestValidator.predicate(
    "refresh capability extended after extended activity",
    () =>
      new Date(finalSession.token.refreshable_until) >
      new Date(guestSession.token.refreshable_until),
  );

  TestValidator.predicate(
    "last activity timestamp updated appropriately",
    () =>
      new Date(finalSession.last_activity_at) >=
      new Date(midSessionResult.last_activity_at),
  );

  // Verify that session remains valid for continued use
  TestValidator.predicate(
    "extended session tokens remain valid",
    () => finalSession.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh tokens remain usable after extended activity",
    () => finalSession.token.refresh.length > 0,
  );
}
