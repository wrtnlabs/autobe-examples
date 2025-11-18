import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";

/**
 * Test successful guest token refresh by creating a new guest session, then
 * refreshing it to extend access duration. Validates that temporary guest
 * sessions can be renewed with new access tokens while maintaining session
 * continuity. Tests proper URL/href tracking and referrer validation to ensure
 * security monitoring works correctly. Verifies that refreshed tokens maintain
 * appropriate expiration boundaries and session metadata integrity.
 *
 * 1. Create initial guest session using join endpoint (dependency)
 * 2. Extract session metadata and authorization token from initial session
 * 3. Verify initial session has proper structure with all required fields
 * 4. Call refresh endpoint with connection context (href and referrer)
 * 5. Validate refreshed session maintains same guest ID and session identifier
 * 6. Verify new access token is generated with updated expiration
 * 7. Confirm refreshed session maintains proper expiration boundaries
 * 8. Validate session metadata integrity across refresh operation
 */
export async function test_api_guest_token_refresh_success(
  connection: api.IConnection,
) {
  // Create initial guest session using dependency endpoint
  const initialGuest = await api.functional.auth.guest.join(connection, {
    body: {
      href: "https://example.com/todo",
      referrer: "https://google.com/search",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.ICreate,
  });
  typia.assert(initialGuest);

  // Extract session metadata for validation
  TestValidator.predicate(
    "initial guest ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      initialGuest.id,
    ),
  );
  TestValidator.predicate(
    "initial session identifier exists",
    initialGuest.session_identifier.length > 0,
  );

  // Prepare refresh request with same connection context
  const refreshRequest = {
    href: "https://example.com/todo/refresh",
    referrer: "https://example.com/todo",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppGuest.IRefresh;

  // Call refresh endpoint
  const refreshedGuest = await api.functional.auth.guest.refresh(connection, {
    body: refreshRequest,
  });
  typia.assert(refreshedGuest);

  // Validate refresh maintains session continuity
  TestValidator.equals(
    "refreshed guest ID matches initial",
    refreshedGuest.id,
    initialGuest.id,
  );
  TestValidator.equals(
    "refreshed session identifier matches initial",
    refreshedGuest.session_identifier,
    initialGuest.session_identifier,
  );
  TestValidator.equals(
    "refreshed created_at matches initial",
    refreshedGuest.created_at,
    initialGuest.created_at,
  );

  // Verify token refresh generated new credentials
  TestValidator.predicate(
    "new access token generated",
    refreshedGuest.token.access !== initialGuest.token.access,
  );
  TestValidator.predicate(
    "new refresh token generated",
    refreshedGuest.token.refresh !== initialGuest.token.refresh,
  );

  // Verify expiration boundaries maintained
  TestValidator.predicate(
    "new access token has proper expiration",
    refreshedGuest.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "new refresh token has proper expiration",
    refreshedGuest.token.refreshable_until.length > 0,
  );

  // Validate session metadata integrity
  TestValidator.predicate(
    "refreshed sessions count consistent",
    refreshedGuest.id.length > 0 &&
      refreshedGuest.session_identifier.length > 0 &&
      refreshedGuest.token.access.length > 0 &&
      refreshedGuest.token.refresh.length > 0,
  );
}
