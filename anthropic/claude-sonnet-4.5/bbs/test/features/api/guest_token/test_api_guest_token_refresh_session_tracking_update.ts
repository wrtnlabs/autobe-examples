import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test that token refresh properly updates session tracking fields for
 * analytics accuracy.
 *
 * This test validates the complete token refresh workflow for guest sessions,
 * ensuring that session tracking fields are updated correctly while maintaining
 * analytics integrity. The test creates an initial guest session, waits a
 * measurable time interval, then refreshes the tokens. It verifies that
 * last_visit_at is updated to the current timestamp (later than the original
 * last_visit_at from join), while first_visit_at remains unchanged from the
 * original session creation time. The test confirms that page_views remains at
 * its previous value (not incremented by refresh operation), and validates that
 * created_at and id remain constant, ensuring session identity continuity.
 * Finally, it ensures updated_at reflects the refresh operation time.
 *
 * Test steps:
 *
 * 1. Create initial guest session via join endpoint
 * 2. Store original session tracking values (first_visit_at, last_visit_at,
 *    page_views, created_at, id)
 * 3. Wait a measurable time interval (at least 100ms) to ensure timestamp
 *    difference
 * 4. Perform token refresh operation using the refresh token
 * 5. Validate that last_visit_at is updated (later than original)
 * 6. Validate that first_visit_at remains unchanged
 * 7. Validate that page_views remains unchanged (not incremented)
 * 8. Validate that id and created_at remain constant
 * 9. Validate that updated_at reflects the refresh operation time
 */
export async function test_api_guest_token_refresh_session_tracking_update(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session
  const sessionIdentifier = typia.random<string & tags.Format<"uuid">>();
  const userAgent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });

  const initialGuest = await api.functional.auth.guest.join(connection, {
    body: {
      session_identifier: sessionIdentifier,
      ip_address: "192.168.1.100",
      user_agent: userAgent,
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(initialGuest);

  // Step 2: Store original session tracking values
  const originalId = initialGuest.id;
  const originalFirstVisitAt = initialGuest.first_visit_at;
  const originalLastVisitAt = initialGuest.last_visit_at;
  const originalPageViews = initialGuest.page_views;
  const originalCreatedAt = initialGuest.created_at;
  const refreshToken = initialGuest.token.refresh;

  // Step 3: Wait a measurable time interval to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 150));

  // Step 4: Perform token refresh operation
  const refreshedGuest = await api.functional.auth.guest.refresh(connection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IDiscussionBoardGuest.IRefresh,
  });
  typia.assert(refreshedGuest);

  // Step 5: Validate that last_visit_at is updated (later than original)
  const originalLastVisitTime = new Date(originalLastVisitAt).getTime();
  const refreshedLastVisitTime = new Date(
    refreshedGuest.last_visit_at,
  ).getTime();
  TestValidator.predicate(
    "last_visit_at should be updated to later timestamp",
    refreshedLastVisitTime > originalLastVisitTime,
  );

  // Step 6: Validate that first_visit_at remains unchanged
  TestValidator.equals(
    "first_visit_at should remain unchanged",
    refreshedGuest.first_visit_at,
    originalFirstVisitAt,
  );

  // Step 7: Validate that page_views remains unchanged (not incremented)
  TestValidator.equals(
    "page_views should not be incremented by refresh",
    refreshedGuest.page_views,
    originalPageViews,
  );

  // Step 8: Validate that id and created_at remain constant
  TestValidator.equals(
    "id should remain constant",
    refreshedGuest.id,
    originalId,
  );

  TestValidator.equals(
    "created_at should remain constant",
    refreshedGuest.created_at,
    originalCreatedAt,
  );

  // Step 9: Validate that updated_at reflects the refresh operation time
  const originalUpdatedTime = new Date(initialGuest.updated_at).getTime();
  const refreshedUpdatedTime = new Date(refreshedGuest.updated_at).getTime();
  TestValidator.predicate(
    "updated_at should reflect the refresh operation time",
    refreshedUpdatedTime >= originalUpdatedTime,
  );

  // Additional validation: Verify session_identifier remains the same
  TestValidator.equals(
    "session_identifier should remain unchanged",
    refreshedGuest.session_identifier,
    sessionIdentifier,
  );
}
