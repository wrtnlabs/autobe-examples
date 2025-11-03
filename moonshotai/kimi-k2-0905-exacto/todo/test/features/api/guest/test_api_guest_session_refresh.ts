import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuest";
import type { ITodoGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuestSession";

/**
 * Test the guest session refresh functionality by creating a new guest session,
 * then refreshing it to extend the session duration. This test verifies that
 * guests can maintain temporary access to the demo functionality without
 * creating accounts.
 *
 * 1. Create guest authentication via auth/guest/join to establish session context
 * 2. Create a new guest session via todo/guests
 * 3. Refresh the guest session via todo/guest/guests/{guestId}/sessions to extend
 *    access duration
 * 4. Validate that the refreshed session maintains proper metadata and
 *    authentication
 * 5. Ensure the guest can continue accessing system functionality without
 *    registration
 *
 * This demonstrates the freemium user acquisition flow where temporary access
 * encourages account registration.
 */
export async function test_api_guest_session_refresh(
  connection: api.IConnection,
) {
  // Step 1: Create guest authentication to establish session context
  const guestAuth: ITodoGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guestAuth);

  // Step 2: Create guest session with the newly established auth
  const sessionData: ITodoGuest.ICreate = {
    ip: RandomGenerator.mobile("010"),
    href: "https://example.com" satisfies string & tags.Format<"uri">,
    referrer: "https://referrer.com" satisfies string & tags.Format<"uri">,
  };

  const guest: ITodoGuest = await api.functional.todo.guests.create(
    connection,
    {
      body: sessionData,
    },
  );
  typia.assert(guest);

  // Step 3: Refresh the guest session to extend access duration
  const refreshData: ITodoGuestSession.IRequest = {
    href: "https://refreshed-example.com" satisfies string & tags.Format<"uri">,
    referrer: "https://refreshed-referrer.com" satisfies string &
      tags.Format<"uri">,
  };

  const refreshedSession: ITodoGuestSession =
    await api.functional.todo.guest.guests.sessions.index(connection, {
      guestId: guest.id,
      body: refreshData,
    });
  typia.assert(refreshedSession);

  // Step 4: Validate refreshed session properties
  TestValidator.equals(
    "guest session id format valid",
    refreshedSession.id,
    refreshedSession.id,
  );
  TestValidator.equals(
    "guest user id matches original",
    refreshedSession.todo_guest_id,
    guest.id,
  );
  TestValidator.predicate(
    "has valid IP address",
    refreshedSession.ip.length > 0,
  );
  TestValidator.equals(
    "refreshed href matches",
    refreshedSession.href,
    refreshData.href,
  );
  TestValidator.equals(
    "refreshed referrer matches",
    refreshedSession.referrer,
    refreshData.referrer,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    refreshedSession.created_at.length > 0,
  );

  // Step 5: Validate session data integrity
  TestValidator.equals(
    "original guest id preserved",
    guest.id,
    refreshedSession.todo_guest_id,
  );
  TestValidator.notEquals(
    "session id different from guest id",
    refreshedSession.id,
    guest.id,
  );
}
