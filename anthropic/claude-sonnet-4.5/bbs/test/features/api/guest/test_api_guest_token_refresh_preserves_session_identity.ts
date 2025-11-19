import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test that multiple token refresh operations preserve guest session identity
 * and continuity.
 *
 * This test validates the core session management requirement that guest
 * sessions maintain their identity across multiple token refresh cycles. When
 * guests browse the platform for extended periods, they need to refresh their
 * authentication tokens to maintain access. This test ensures that repeated
 * token refreshes preserve the guest's unique identity (guest ID and
 * session_identifier) while accurately tracking ongoing engagement through
 * progressing timestamps.
 *
 * Test Flow:
 *
 * 1. Create initial guest session with unique session_identifier
 * 2. Perform first token refresh operation
 * 3. Perform second token refresh operation
 * 4. Perform third token refresh operation
 * 5. Validate identity preservation across all refreshes
 * 6. Validate timestamp progression reflects ongoing activity
 * 7. Validate token structure and validity after each refresh
 *
 * Success Criteria:
 *
 * - Guest ID remains constant across all operations
 * - Session_identifier never changes
 * - First_visit_at timestamp is immutable
 * - Last_visit_at progresses forward with each refresh
 * - Each refresh returns valid new tokens with proper structure
 */
export async function test_api_guest_token_refresh_preserves_session_identity(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session
  const sessionIdentifier = typia.random<string & tags.Format<"uuid">>();
  const userAgent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });

  const initialGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        session_identifier: sessionIdentifier,
        user_agent: userAgent,
      } satisfies IDiscussionBoardGuest.ICreate,
    });
  typia.assert(initialGuest);

  // Capture initial session identity for comparison
  const originalGuestId = initialGuest.id;
  const originalSessionIdentifier = initialGuest.session_identifier;
  const originalFirstVisitAt = initialGuest.first_visit_at;
  let previousLastVisitAt = initialGuest.last_visit_at;

  // Validate initial session structure
  TestValidator.equals(
    "initial session_identifier matches",
    initialGuest.session_identifier,
    sessionIdentifier,
  );
  typia.assert(initialGuest.token);

  // Step 2: First token refresh
  const firstRefresh: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: initialGuest.token.refresh,
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  typia.assert(firstRefresh);

  // Validate identity preservation after first refresh
  TestValidator.equals(
    "guest id preserved after first refresh",
    firstRefresh.id,
    originalGuestId,
  );
  TestValidator.equals(
    "session_identifier preserved after first refresh",
    firstRefresh.session_identifier,
    originalSessionIdentifier,
  );
  TestValidator.equals(
    "first_visit_at unchanged after first refresh",
    firstRefresh.first_visit_at,
    originalFirstVisitAt,
  );

  // Validate timestamp progression
  TestValidator.predicate(
    "last_visit_at progressed after first refresh",
    new Date(firstRefresh.last_visit_at).getTime() >=
      new Date(previousLastVisitAt).getTime(),
  );

  // Validate token structure
  typia.assert(firstRefresh.token);
  TestValidator.predicate(
    "first refresh has new access token",
    firstRefresh.token.access.length > 0,
  );
  TestValidator.predicate(
    "first refresh has new refresh token",
    firstRefresh.token.refresh.length > 0,
  );

  previousLastVisitAt = firstRefresh.last_visit_at;

  // Step 3: Second token refresh
  const secondRefresh: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: firstRefresh.token.refresh,
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  typia.assert(secondRefresh);

  // Validate identity preservation after second refresh
  TestValidator.equals(
    "guest id preserved after second refresh",
    secondRefresh.id,
    originalGuestId,
  );
  TestValidator.equals(
    "session_identifier preserved after second refresh",
    secondRefresh.session_identifier,
    originalSessionIdentifier,
  );
  TestValidator.equals(
    "first_visit_at unchanged after second refresh",
    secondRefresh.first_visit_at,
    originalFirstVisitAt,
  );

  // Validate timestamp progression
  TestValidator.predicate(
    "last_visit_at progressed after second refresh",
    new Date(secondRefresh.last_visit_at).getTime() >=
      new Date(previousLastVisitAt).getTime(),
  );

  // Validate token structure
  typia.assert(secondRefresh.token);
  TestValidator.predicate(
    "second refresh has new access token",
    secondRefresh.token.access.length > 0,
  );
  TestValidator.predicate(
    "second refresh has new refresh token",
    secondRefresh.token.refresh.length > 0,
  );

  previousLastVisitAt = secondRefresh.last_visit_at;

  // Step 4: Third token refresh for comprehensive validation
  const thirdRefresh: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: secondRefresh.token.refresh,
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  typia.assert(thirdRefresh);

  // Validate identity preservation after third refresh
  TestValidator.equals(
    "guest id preserved after third refresh",
    thirdRefresh.id,
    originalGuestId,
  );
  TestValidator.equals(
    "session_identifier preserved after third refresh",
    thirdRefresh.session_identifier,
    originalSessionIdentifier,
  );
  TestValidator.equals(
    "first_visit_at unchanged after third refresh",
    thirdRefresh.first_visit_at,
    originalFirstVisitAt,
  );

  // Validate timestamp progression
  TestValidator.predicate(
    "last_visit_at progressed after third refresh",
    new Date(thirdRefresh.last_visit_at).getTime() >=
      new Date(previousLastVisitAt).getTime(),
  );

  // Validate token structure
  typia.assert(thirdRefresh.token);
  TestValidator.predicate(
    "third refresh has new access token",
    thirdRefresh.token.access.length > 0,
  );
  TestValidator.predicate(
    "third refresh has new refresh token",
    thirdRefresh.token.refresh.length > 0,
  );

  // Final comprehensive validation: session continuity across all refreshes
  TestValidator.equals(
    "guest id consistent across all operations",
    thirdRefresh.id,
    originalGuestId,
  );
  TestValidator.equals(
    "session_identifier consistent across all operations",
    thirdRefresh.session_identifier,
    originalSessionIdentifier,
  );
  TestValidator.equals(
    "first_visit_at immutable across all operations",
    thirdRefresh.first_visit_at,
    originalFirstVisitAt,
  );

  // Validate complete token structure on final refresh
  TestValidator.predicate(
    "final token has expired_at",
    thirdRefresh.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "final token has refreshable_until",
    thirdRefresh.token.refreshable_until.length > 0,
  );
}
