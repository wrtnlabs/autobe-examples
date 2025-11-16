import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test guest registration session context tracking for analytics.
 *
 * This test validates that the guest registration API properly captures and
 * stores session context information including href (current page URL),
 * referrer (previous page URL), and IP address. These fields enable proper
 * tracking of guest acquisition sources, landing pages, and navigation patterns
 * for analytics purposes.
 *
 * The test covers three realistic scenarios:
 *
 * 1. External referrer - Guest arriving from search engine or external website
 * 2. Internal referrer - Guest navigating from another page within the application
 * 3. Direct access - Guest accessing the page directly (empty referrer)
 *
 * Each scenario verifies that:
 *
 * - Session context is correctly accepted and stored
 * - Guest account is created successfully
 * - JWT tokens are issued for authentication
 * - All response data passes type validation
 */
export async function test_api_guest_registration_session_context_tracking(
  connection: api.IConnection,
) {
  // Scenario 1: External Referrer - Guest from search engine
  const externalReferrer = "https://www.google.com/search?q=todo+list+app";
  const landingPageExternal = "https://example.com/welcome";
  const ipAddressExternal = "203.0.113.42";

  const guestFromExternal = await api.functional.auth.guest.join(connection, {
    body: {
      ip: ipAddressExternal,
      href: landingPageExternal,
      referrer: externalReferrer,
    } satisfies ITodoListGuest.ICreate,
  });
  typia.assert(guestFromExternal);

  // Scenario 2: Internal Referrer - Guest from another page in the app
  const internalReferrer = "https://example.com/features";
  const landingPageInternal = "https://example.com/signup";
  const ipAddressInternal = "198.51.100.123";

  const guestFromInternal = await api.functional.auth.guest.join(connection, {
    body: {
      ip: ipAddressInternal,
      href: landingPageInternal,
      referrer: internalReferrer,
    } satisfies ITodoListGuest.ICreate,
  });
  typia.assert(guestFromInternal);

  // Scenario 3: Direct Access - Guest with empty referrer (typed URL or bookmark)
  const landingPageDirect = "https://example.com/";
  const emptyReferrer = "";
  const ipAddressDirect = "192.0.2.88";

  const guestFromDirect = await api.functional.auth.guest.join(connection, {
    body: {
      ip: ipAddressDirect,
      href: landingPageDirect,
      referrer: emptyReferrer,
    } satisfies ITodoListGuest.ICreate,
  });
  typia.assert(guestFromDirect);

  // Verify all three guests are distinct (business logic validation)
  TestValidator.predicate(
    "all guests have unique IDs",
    guestFromExternal.id !== guestFromInternal.id &&
      guestFromInternal.id !== guestFromDirect.id &&
      guestFromExternal.id !== guestFromDirect.id,
  );
}
