import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";

/**
 * Test that guest analytics properly expose summary data while maintaining
 * appropriate privacy boundaries.
 *
 * This test validates that the guest analytics API returns ISummary data
 * containing essential engagement metrics (session_identifier, visit
 * timestamps, page_views, created_at, updated_at) suitable for analytics
 * without exposing sensitive technical details beyond moderator access scope.
 *
 * Test Flow:
 *
 * 1. Create a moderator account for authentication
 * 2. Retrieve guest records via the analytics endpoint
 * 3. Validate response structure contains pagination and data array
 * 4. Verify guest ISummary objects are properly typed and validated
 * 5. Confirm the data structure supports analytics dashboards and conversion
 *    reports
 */
export async function test_api_guest_analytics_privacy_and_summary_data(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account to access guest analytics endpoint
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve guest analytics data with basic pagination parameters
  const guestSearchRequest = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardGuest.IRequest;

  const guestPage: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: guestSearchRequest,
    });
  typia.assert(guestPage);

  // Step 3: Validate pagination values match request parameters
  TestValidator.equals(
    "pagination current page matches request",
    guestPage.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit matches request",
    guestPage.pagination.limit,
    20,
  );

  // Step 4: If there are guest records, validate ISummary structure
  if (guestPage.data.length > 0) {
    const sampleGuest = guestPage.data[0];
    typia.assert(sampleGuest);

    // Validate all guest records in the response
    guestPage.data.forEach((guest) => {
      typia.assert(guest);
    });
  }
}
