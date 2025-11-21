import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function test_api_guest_token_refresh_expired_session(
  connection: api.IConnection,
) {
  // Step 1: Create a guest session to test with
  const guestSession = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://test-shop.example.com/products",
    referrer: "https://search-engine.example.com/results",
    session_id: RandomGenerator.alphaNumeric(32),
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestBrowser/91.0",
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallGuest.ICreate;

  // Step 2: Register as guest to establish authenticated session
  const guestAuth = await api.functional.auth.guest.join(connection, {
    body: guestSession,
  });
  typia.assert(guestAuth);

  TestValidator.predicate(
    "guest session created successfully",
    Boolean(guestAuth.id),
  );
  TestValidator.predicate(
    "session ID matches request",
    guestAuth.session_id === guestSession.session_id,
  );

  // Step 3: Test refresh with unauthenticated connection (simulating expired/session state)
  // This represents the scenario where a guest session has expired or is invalid
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 4: Attempt refresh operation with unauthenticated context
  // This should fail appropriately to maintain security when no valid auth exists
  await TestValidator.error(
    "refresh should fail with unauthenticated session context",
    async () => {
      await api.functional.auth.guest.refresh(unauthConn, {
        body: {
          session_id: guestAuth.session_id,
        } satisfies IShoppingMallGuest.IRefresh,
      });
    },
  );

  // Step 5: Verify that we can create a fresh guest session after failed refresh
  const freshGuestSession = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://test-shop.example.com/cart",
    referrer: "https://marketplace.example.com/browse",
    session_id: RandomGenerator.alphaNumeric(32),
    user_agent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) TestBrowser/91.0",
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallGuest.ICreate;

  const freshGuestAuth = await api.functional.auth.guest.join(connection, {
    body: freshGuestSession,
  });
  typia.assert(freshGuestAuth);

  TestValidator.predicate(
    "fresh guest session created after failed refresh",
    Boolean(freshGuestAuth.id),
  );
  TestValidator.notEquals(
    "new session has different session_id",
    guestAuth.session_id,
    freshGuestAuth.session_id,
  );

  // Step 6: Verify that the fresh session can be properly refreshed using authenticated connection
  const refreshedSession = await api.functional.auth.guest.refresh(connection, {
    body: {
      session_id: freshGuestAuth.session_id,
    } satisfies IShoppingMallGuest.IRefresh,
  });
  typia.assert(refreshedSession);

  TestValidator.predicate(
    "verified fresh session refresh works",
    Boolean(refreshedSession.id),
  );
  TestValidator.equals(
    "session ID maintained through refresh",
    freshGuestAuth.session_id,
    refreshedSession.session_id,
  );
}
