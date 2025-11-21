import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

/**
 * Test guest session behavior when multiple sessions are requested from same
 * client context.
 *
 * This test validates that guest session creation handles concurrent requests
 * appropriately without requiring user management patterns. It ensures that
 * guest session management supports marketplace browsing patterns effectively
 * and verifies that anonymous session handling provides flexibility for
 * browsing visitors while maintaining session continuity and user experience
 * standards.
 *
 * Test scenarios covered:
 *
 * 1. Create multiple guest sessions with different session IDs from same
 *    connection
 * 2. Verify each session gets unique authentication tokens
 * 3. Validate session data integrity and proper token assignment
 * 4. Test session creation timing and proper handling of concurrent requests
 * 5. Ensure guest sessions maintain proper browsing functionality
 */
export async function test_api_guest_session_duplicate_creation(
  connection: IConnection,
) {
  // Generate random session data for first guest session
  const sessionId1 = RandomGenerator.alphaNumeric(32);
  const currentTime = new Date().toISOString();
  const currentUrl = typia.random<string & tags.Format<"uri">>();
  const referrerUrl = typia.random<string & tags.Format<"uri">>();
  const userAgent = RandomGenerator.alphabets(20);
  const ipv4Addr = typia.random<string & tags.Format<"ipv4">>();

  const guestSession1 = await api.functional.auth.guest.join(connection, {
    body: {
      href: currentUrl,
      referrer: referrerUrl,
      session_id: sessionId1,
      user_agent: userAgent,
      last_activity_at: currentTime,
      created_at: currentTime,
      updated_at: currentTime,
      ip: ipv4Addr,
      deleted_at: undefined,
    } satisfies IShoppingMallGuest.ICreate,
  });

  // Validate first guest session response
  typia.assert(guestSession1);
  TestValidator.equals(
    "first guest session ID matches",
    guestSession1.session_id,
    sessionId1,
  );
  TestValidator.predicate(
    "first session has valid token",
    guestSession1.token.access.length > 0,
  );

  // Generate different session data for second guest session
  const sessionId2 = RandomGenerator.alphaNumeric(32);
  const newTime = new Date(Date.now() + 1000).toISOString();
  const newUrl = typia.random<string & tags.Format<"uri">>();
  const newReferrer = typia.random<string & tags.Format<"uri">>();
  const newUserAgent = RandomGenerator.alphabets(20);
  const newIpv4Addr = typia.random<string & tags.Format<"ipv4">>();

  const guestSession2 = await api.functional.auth.guest.join(connection, {
    body: {
      href: newUrl,
      referrer: newReferrer,
      session_id: sessionId2,
      user_agent: newUserAgent,
      last_activity_at: newTime,
      created_at: newTime,
      updated_at: newTime,
      ip: newIpv4Addr,
      deleted_at: undefined,
    } satisfies IShoppingMallGuest.ICreate,
  });

  // Validate second guest session response
  typia.assert(guestSession2);
  TestValidator.equals(
    "second guest session ID matches",
    guestSession2.session_id,
    sessionId2,
  );
  TestValidator.predicate(
    "second session has valid token",
    guestSession2.token.access.length > 0,
  );

  // Test third session with different parameters
  const sessionId3 = RandomGenerator.alphaNumeric(32);
  const currentTime3 = new Date(Date.now() + 2000).toISOString();

  const guestSession3 = await api.functional.auth.guest.join(connection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      session_id: sessionId3,
      user_agent: RandomGenerator.alphabets(25),
      last_activity_at: currentTime3,
      created_at: currentTime3,
      updated_at: currentTime3,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      deleted_at: undefined,
    } satisfies IShoppingMallGuest.ICreate,
  });

  // Validate third guest session response
  typia.assert(guestSession3);
  TestValidator.equals(
    "third guest session ID matches",
    guestSession3.session_id,
    sessionId3,
  );
  TestValidator.predicate(
    "third session has valid token",
    guestSession3.token.access.length > 0,
  );

  // Verify session uniqueness and no collisions
  TestValidator.notEquals(
    "session IDs are unique",
    guestSession1.session_id,
    guestSession2.session_id,
  );
  TestValidator.notEquals(
    "session IDs remain unique",
    guestSession1.session_id,
    guestSession3.session_id,
  );
  TestValidator.notEquals(
    "session IDs different from each other",
    guestSession2.session_id,
    guestSession3.session_id,
  );

  // Validate token uniqueness between sessions
  TestValidator.notEquals(
    "authentication tokens are unique",
    guestSession1.token.access,
    guestSession2.token.access,
  );
  TestValidator.notEquals(
    "authentication tokens remain unique",
    guestSession1.token.access,
    guestSession3.token.access,
  );

  // Verify all sessions have valid guest authorization structure
  TestValidator.predicate(
    "all sessions have valid UUIDs",
    typia.is<string & tags.Format<"uuid">>(guestSession1.id),
  );
  TestValidator.predicate(
    "all sessions have valid UUIDs",
    typia.is<string & tags.Format<"uuid">>(guestSession2.id),
  );
  TestValidator.predicate(
    "all sessions have valid UUIDs",
    typia.is<string & tags.Format<"uuid">>(guestSession3.id),
  );

  // Test concurrent session creation doesn't cause conflicts
  const concurrentSession1 = ArrayUtil.repeat(5, (index) => {
    return RandomGenerator.alphaNumeric(32 + index);
  });

  const concurrentSession2 = ArrayUtil.repeat(5, (index) => {
    return RandomGenerator.alphaNumeric(32 + index + 5);
  });

  // Create sessions concurrently with different timing
  const concurrentPromises = await Promise.all([
    api.functional.auth.guest.join(connection, {
      body: {
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        session_id: concurrentSession1[0],
        user_agent: RandomGenerator.alphabets(20),
        last_activity_at: new Date(Date.now() + 3000).toISOString(),
        created_at: new Date(Date.now() + 3000).toISOString(),
        updated_at: new Date(Date.now() + 3000).toISOString(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
        deleted_at: undefined,
      } satisfies IShoppingMallGuest.ICreate,
    }),
    api.functional.auth.guest.join(connection, {
      body: {
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        session_id: concurrentSession2[0],
        user_agent: RandomGenerator.alphabets(21),
        last_activity_at: new Date(Date.now() + 3001).toISOString(),
        created_at: new Date(Date.now() + 3001).toISOString(),
        updated_at: new Date(Date.now() + 3001).toISOString(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
        deleted_at: undefined,
      } satisfies IShoppingMallGuest.ICreate,
    }),
  ]);

  // Validate concurrent session creation
  const [concurrentGuest1, concurrentGuest2] = concurrentPromises;
  typia.assert(concurrentGuest1);
  typia.assert(concurrentGuest2);

  TestValidator.notEquals(
    "concurrent sessions have unique IDs",
    concurrentGuest1.session_id,
    concurrentGuest2.session_id,
  );
  TestValidator.notEquals(
    "concurrent sessions have unique tokens",
    concurrentGuest1.token.access,
    concurrentGuest2.token.access,
  );

  // Validate proper session field structure
  TestValidator.predicate(
    "session has last activity timestamp",
    concurrentGuest1.last_activity_at.length > 0,
  );
  TestValidator.predicate(
    "session has user agent",
    concurrentGuest1.user_agent.length > 0,
  );
  TestValidator.predicate(
    "session has IP address",
    concurrentGuest1.ip_address.length > 0,
  );
}
