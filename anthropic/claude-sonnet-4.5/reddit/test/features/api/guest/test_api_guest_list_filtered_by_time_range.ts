import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test filtering guest visitors by creation time range.
 *
 * This test validates that moderators can retrieve guests within specific time
 * boundaries for historical analysis or recent traffic monitoring. It verifies
 * that the time range filtering works correctly by:
 *
 * 1. Creating and authenticating a moderator account
 * 2. Requesting guests created within a specific date range
 * 3. Verifying all returned guest records fall within the specified time range
 * 4. Validating pagination and response structure
 */
export async function test_api_guest_list_filtered_by_time_range(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecureMod123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Define time range for filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const createdAfter = thirtyDaysAgo.toISOString();
  const createdBefore = sevenDaysAgo.toISOString();

  // Step 3: Request guests filtered by time range
  const guestPage: IPageIRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.moderator.guests.index(connection, {
      body: {
        page: 1,
        limit: 20,
        created_after: createdAfter,
        created_before: createdBefore,
      } satisfies IRedditCommunityGuest.IRequest,
    });
  typia.assert(guestPage);

  // Step 4: Validate pagination structure
  TestValidator.predicate(
    "pagination metadata should exist",
    guestPage.pagination !== null && guestPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "guest data array should exist",
    Array.isArray(guestPage.data),
  );

  // Step 5: Verify all returned guests fall within the specified time range
  const createdAfterTime = new Date(createdAfter).getTime();
  const createdBeforeTime = new Date(createdBefore).getTime();

  for (const guest of guestPage.data) {
    const guestCreatedTime = new Date(guest.created_at).getTime();

    TestValidator.predicate(
      "guest created_at should be after or equal to created_after",
      guestCreatedTime >= createdAfterTime,
    );

    TestValidator.predicate(
      "guest created_at should be before or equal to created_before",
      guestCreatedTime <= createdBeforeTime,
    );
  }

  // Step 6: Validate pagination values are consistent
  TestValidator.predicate(
    "current page should be 1",
    guestPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit should be 20",
    guestPage.pagination.limit === 20,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    guestPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    guestPage.pagination.pages >= 0,
  );
}
