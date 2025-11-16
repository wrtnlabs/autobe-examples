import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validates guest registration endpoint with stateless validation.
 *
 * Tests that guest registration succeeds consistently without state-dependent
 * business rules. Verifies that the endpoint returns valid authorization
 * credentials regardless of timing, request order, or existing sessions.
 *
 * Steps:
 *
 * 1. Register first guest account
 * 2. Validate response structure and token format
 * 3. Register second guest account to verify no state conflicts
 * 4. Validate both responses have consistent structure
 * 5. Verify guest IDs are unique UUIDs
 * 6. Test repeated registration attempts work without errors
 * 7. Confirm token expiration timestamps are valid
 */
export async function test_api_guest_registration_stateless_validation(
  connection: api.IConnection,
) {
  // Register first guest
  const guest1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guest1);

  TestValidator.predicate(
    "first guest access token should exist and be non-empty",
    guest1.token.access.length > 0,
  );

  TestValidator.predicate(
    "first guest refresh token should exist and be non-empty",
    guest1.token.refresh.length > 0,
  );

  // Validate token expiration dates
  const expired1 = new Date(guest1.token.expired_at);
  TestValidator.predicate(
    "first guest access token expiration should be valid datetime",
    !isNaN(expired1.getTime()),
  );

  const refreshable1 = new Date(guest1.token.refreshable_until);
  TestValidator.predicate(
    "first guest refresh token expiration should be valid datetime",
    !isNaN(refreshable1.getTime()),
  );

  TestValidator.predicate(
    "access token should expire before or at same time as refresh token",
    expired1.getTime() <= refreshable1.getTime(),
  );

  // Register second guest - verify no state conflicts
  const guest2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guest2);

  TestValidator.notEquals(
    "second guest should have different ID from first",
    guest1.id,
    guest2.id,
  );

  TestValidator.notEquals(
    "second guest should have different access token from first",
    guest1.token.access,
    guest2.token.access,
  );

  // Register third guest - verify consistency
  const guest3: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guest3);

  TestValidator.notEquals(
    "third guest should have different ID from first",
    guest3.id,
    guest1.id,
  );

  TestValidator.notEquals(
    "third guest should have different ID from second",
    guest3.id,
    guest2.id,
  );

  // Verify response structure consistency across all guests
  const guests = [guest1, guest2, guest3];

  for (let i = 0; i < guests.length; i++) {
    const guest = guests[i];

    TestValidator.predicate(
      `guest ${i + 1} should have non-empty ID`,
      guest.id.length > 0,
    );

    TestValidator.predicate(
      `guest ${i + 1} should have non-empty access token`,
      guest.token.access.length > 0,
    );

    TestValidator.predicate(
      `guest ${i + 1} should have non-empty refresh token`,
      guest.token.refresh.length > 0,
    );

    const guestExpired = new Date(guest.token.expired_at);
    TestValidator.predicate(
      `guest ${i + 1} access token expiration should be valid datetime`,
      !isNaN(guestExpired.getTime()),
    );

    const guestRefreshable = new Date(guest.token.refreshable_until);
    TestValidator.predicate(
      `guest ${i + 1} refresh token expiration should be valid datetime`,
      !isNaN(guestRefreshable.getTime()),
    );
  }

  // Verify no state conflicts with rapid successive calls
  const rapidGuests = await ArrayUtil.asyncRepeat(3, async () => {
    return await api.functional.auth.guest.join(connection);
  });

  for (const rapidGuest of rapidGuests) {
    typia.assert(rapidGuest);
  }

  const allGuestIds = [
    guest1.id,
    guest2.id,
    guest3.id,
    ...rapidGuests.map((g) => g.id),
  ];

  const uniqueIds = new Set(allGuestIds);
  TestValidator.equals(
    "all registered guests should have unique IDs",
    uniqueIds.size,
    allGuestIds.length,
  );

  TestValidator.predicate(
    "rapid registrations should not cause state conflicts",
    rapidGuests.length === 3 &&
      rapidGuests.every((g) => g.id.length > 0 && g.token.access.length > 0),
  );
}
